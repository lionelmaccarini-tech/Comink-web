import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ── POST /api/production/lines/[id]/analyze ───────────────────────────────────
// Lance l'analyse Claude du fichier lié à la ligne et sauvegarde le résultat
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()

    // Get the production line
    const { data: line, error: lineErr } = await supabase
      .from('production_lines')
      .select('id, file_url, file_name, product_name, width_cm, height_cm')
      .eq('id', id)
      .single()

    if (lineErr || !line) {
      return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 })
    }
    if (!line.file_url) {
      return NextResponse.json({ error: 'Aucun fichier sur cette ligne' }, { status: 400 })
    }

    // Vérifier si un aperçu preview existe (convention : file_url + '.preview.jpg')
    const previewUrl = `${line.file_url}.preview.jpg`
    let analysisUrl: string | null = null
    try {
      const headRes = await fetch(previewUrl, { method: 'HEAD' })
      if (headRes.ok) analysisUrl = previewUrl
    } catch { /* preview inexistant — utilise le fichier complet */ }

    // Call the analyze-file endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const analyzeRes = await fetch(`${baseUrl}/api/crm/analyze-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url:     line.file_url,
        analysis_url: analysisUrl,   // petit JPEG preview si disponible (gros fichiers)
        file_name:    line.file_name,
        product_name: line.product_name,
        dimensions:   line.width_cm && line.height_cm
          ? `${line.width_cm} × ${line.height_cm} cm`
          : undefined,
      }),
    })

    if (!analyzeRes.ok) throw new Error(`Analyse échouée: ${analyzeRes.status}`)
    const analysis = await analyzeRes.json()
    if (analysis.error) throw new Error(analysis.error)

    // Save analysis to the production line
    const { data: updated, error: updateErr } = await supabase
      .from('production_lines')
      .update({ file_analysis: analysis, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ analysis, line: updated })
  } catch (err: any) {
    console.error('[production/lines/analyze POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
