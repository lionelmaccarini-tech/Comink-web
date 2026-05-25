import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const line = content.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='))
    if (line) return line.split('=').slice(1).join('=').trim()
  } catch {}
  return ''
}

// ── Printing analysis system prompt ──────────────────────────────────────────
const SYSTEM = `Tu es un expert en prépresse et impression grand format.
Tu analyses les fichiers visuels transmis par les clients pour vérifier leur conformité avant impression.

Tu dois évaluer chaque fichier sur ces critères et retourner un JSON structuré :

{
  "score": 0-100,
  "status": "ok" | "warning" | "error",
  "summary": "Résumé court en 1-2 phrases",
  "checks": [
    {
      "id": "resolution",
      "label": "Résolution",
      "status": "ok" | "warning" | "error",
      "message": "...",
      "detail": "..."
    },
    ...
  ],
  "recommendations": ["...", "..."]
}

Critères à analyser :
- **resolution**: Pour l'impression grand format, 72-100 dpi à taille finale est acceptable, 150+ dpi est bon, en dessous de 72 dpi c'est insuffisant. Si tu vois des artefacts de compression ou du flou, status = "warning". En dessous de 50 dpi visible, status = "error".
- **color_mode**: CMYK est obligatoire pour l'impression. **RGB est REFUSÉ : status = "error"** — le client doit renvoyer le fichier en CMYK. Noir et blanc (niveaux de gris) est acceptable.
- **bleed**: Présence de fond perdu (3-5mm) recommandée pour les produits avec découpe. Si tu vois des bords blancs nets sur un fichier qui devrait avoir un fond perdu, status = "warning".
- **text_legibility**: Le texte est-il lisible ? Suffisamment grand ? Pas trop proche des bords ? Texte illisible = "error".
- **format**: PDF vectoriel = parfait ("ok"), PNG/JPG haute résolution = "ok", JPG compressé avec artefacts = "warning", fichiers office (Word, PowerPoint) = "error".
- **overall_quality**: Qualité générale du visuel, clarté, cohérence.

RÈGLE ABSOLUE : Un fichier RGB doit avoir color_mode.status = "error" et apparaître dans le résumé. Le score global ne peut pas dépasser 40 si le mode colorimétrique est RGB.
Le status global ("ok"/"warning"/"error") est "error" si au moins un check est "error", "warning" si au moins un est "warning", "ok" sinon.
Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`

// ── POST /api/crm/analyze-file ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { file_url, file_name, product_name, dimensions } = await req.json()

    if (!file_url) {
      return NextResponse.json({ error: 'file_url requis' }, { status: 400 })
    }

    const ext = (file_name || file_url).split('.').pop()?.toLowerCase() || ''
    const isPDF = ext === 'pdf'
    const isImage = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'].includes(ext)

    if (!isPDF && !isImage) {
      return NextResponse.json({
        score: 50,
        status: 'warning',
        summary: `Format ${ext.toUpperCase()} non analysable automatiquement.`,
        checks: [{
          id: 'format',
          label: 'Format',
          status: 'warning',
          message: `Les fichiers ${ext.toUpperCase()} (ex: .ai, .eps) ne peuvent pas être prévisualisés automatiquement.`,
          detail: 'Vérification manuelle requise.',
        }],
        recommendations: ['Demandez au client un export PDF ou JPG/PNG pour vérification automatique.'],
      })
    }

    const client = new Anthropic({ apiKey: getAnthropicKey() })

    // ── Fetch file and convert to base64 ──────────────────────────────────────
    const fetchRes = await fetch(file_url)
    if (!fetchRes.ok) throw new Error(`Impossible de télécharger le fichier: ${fetchRes.status}`)

    const buffer = await fetchRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Limit size: 20MB for images, 32MB for PDFs
    const MAX_BYTES = isPDF ? 32 * 1024 * 1024 : 20 * 1024 * 1024
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({
        score: 60,
        status: 'warning',
        summary: 'Fichier trop volumineux pour analyse automatique.',
        checks: [{
          id: 'format',
          label: 'Taille fichier',
          status: 'warning',
          message: `Fichier de ${Math.round(buffer.byteLength / 1024 / 1024)}MB — trop grand pour l'analyse IA.`,
          detail: 'Un fichier volumineux est souvent signe de bonne qualité, mais vérification manuelle requise.',
        }],
        recommendations: ['Vérifiez manuellement la résolution et le mode colorimétrique.'],
      })
    }

    const mediaType = isPDF
      ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
      : 'image/jpeg'

    // ── Build context for Claude ──────────────────────────────────────────────
    const contextParts = [
      product_name ? `Produit commandé : ${product_name}` : null,
      dimensions   ? `Dimensions finales : ${dimensions}` : null,
      `Nom du fichier : ${file_name || 'inconnu'}`,
    ].filter(Boolean).join('\n')

    // ── Call Claude with vision ───────────────────────────────────────────────
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type: isPDF ? 'document' : 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          } as any,
          {
            type: 'text',
            text: contextParts
              ? `Analyse ce fichier pour impression grand format.\n\nContexte:\n${contextParts}`
              : 'Analyse ce fichier pour impression grand format.',
          },
        ],
      }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Parse JSON response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse Claude invalide')

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json(analysis)

  } catch (err: any) {
    console.error('[analyze-file POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
