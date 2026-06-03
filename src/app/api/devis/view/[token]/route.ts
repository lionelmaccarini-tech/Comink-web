import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/devis/view/[token]
 * Route publique (pas de login requis) — charge un devis par son public_token
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('quotes')
      .select(
        'id, quote_number, client_name, client_email, client_company, reference, ' +
        'items, subtotal, tax, total, notes, valid_until, pipeline_stage, status, created_at',
      )
      .eq('public_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/devis/view GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
