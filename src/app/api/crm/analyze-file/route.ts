import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60 // secondes (nécessite Vercel Pro)

function getAnthropicKey(): string {
  // Bracket notation + variable = force runtime evaluation (bypass Turbopack inlining)
  const envKey = 'ANTHROPIC_API_KEY'
  const fromEnv = (process.env as Record<string, string | undefined>)[envKey]
  if (fromEnv) return fromEnv
  // Fallback local dev : lit .env.local directement
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

Retourne UNIQUEMENT ce JSON valide (aucun texte avant/après, aucun markdown) :

{
  "score": 85,
  "status": "ok",
  "summary": "1-2 phrases résumant les points clés",
  "checks": [
    { "id": "dimensions", "label": "Dimensions", "status": "ok", "message": "constat", "detail": "explication technique précise" }
  ],
  "recommendations": ["action 1", "action 2"]
}

Critères OBLIGATOIRES (un check par critère) :

1. **dimensions** (id:"dimensions") — Extraire les dimensions du nom de fichier ou du document. detail: dimensions détectées ou "Non trouvées".
2. **resolution** (id:"resolution") — 150+ dpi = ok, 72-149 dpi = warning, < 72 dpi = error. Flou/artefacts visibles = error. detail: dpi détecté ou estimé.
3. **color_mode** (id:"color_mode") — IMPORTANT : pour un PDF transmis directement, lis les métadonnées du document et les espaces colorimétriques déclarés (ColorSpace, /CS entries, profils ICC). CMJN/CMYK = ok. RVB/RGB = error (client doit renvoyer en CMJN). Niveaux de gris = ok. Tu DOIS déterminer le mode colorimétrique réel — ne jamais répondre "impossible à déterminer" pour un PDF complet. Analyse les espaces de couleur des objets graphiques dans le document. detail: mode colorimétrique détecté avec certitude ou forte probabilité + espace colorimétrique exact (ex: "CMJN DeviceCMYK", "RVB sRGB", "Gris DeviceGray").
4. **fonts** (id:"fonts") — Polices converties en tracés (outlines) = ok. Polices live non embarquées = warning/error. detail: polices détectées et statut.
5. **images_embedded** (id:"images_embedded") — Images bitmap embarquées à bonne résolution = ok. Basse résolution = warning. Manquantes = error. detail: résolution des images.
6. **cut_contour** (id:"cut_contour") — Tracé de découpe (Tom Direct, 100% Magenta) présent = ok. Absent pour produit découpé = warning. Standard bâche/banderole = ok sans tracé. detail: présence ou absence.
7. **bleed** (id:"bleed") — Fond perdu 3-5mm présent = ok. Bords blancs nets = warning. detail: observation des bords.
8. **text_legibility** (id:"text_legibility") — Texte lisible, sécurité respectée = ok. Trop petit ou trop en bordure = warning. detail: observations.

RÈGLES :
- RVB = error obligatoire. Score ≤ 40 si color_mode est "error".
- status global "error" si un check est "error", "warning" si un check est "warning".
- score 80-100 ok, 60-79 warnings, 40-59 corrections, < 40 erreurs critiques.
- checks: toujours un tableau, jamais null/undefined.`

// ── POST /api/crm/analyze-file ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const apiKey = getAnthropicKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Service d\'analyse temporairement indisponible. Veuillez contacter Comink directement.' },
        { status: 503 }
      )
    }

    const { file_url, file_name, product_name, dimensions, product_bleed, product_diecut,
            analysis_url, cmyk_hint } = await req.json()

    if (!file_url) {
      return NextResponse.json({ error: 'file_url requis' }, { status: 400 })
    }

    // Si un aperçu page-1 est disponible (gros fichiers), on l'utilise pour l'analyse Claude
    const effectiveUrl = analysis_url || file_url
    const ext = (file_name || effectiveUrl).split('.').pop()?.toLowerCase().replace(/\?.*$/, '') || ''
    // Quand on utilise un preview .jpg pour analyser un PDF original
    const isPDF = !analysis_url && ext === 'pdf'
    const isImage = analysis_url ? true : ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'].includes(ext)

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

    const client = new Anthropic({ apiKey })

    // ── Vérifier la taille AVANT de charger en mémoire ───────────────────────
    const headRes = await fetch(effectiveUrl, { method: 'HEAD' })
    const contentLength = headRes.headers.get('content-length')
    const MAX_BYTES = isPDF ? 32 * 1024 * 1024 : 20 * 1024 * 1024
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return NextResponse.json({
        score: 60,
        status: 'warning',
        summary: 'Fichier trop volumineux pour analyse automatique.',
        checks: [{
          id: 'format',
          label: 'Taille fichier',
          status: 'warning',
          message: `Fichier de ${Math.round(Number(contentLength) / 1024 / 1024)}MB — trop grand pour l'analyse IA (limite ${Math.round(MAX_BYTES / 1024 / 1024)}MB).`,
          detail: 'Un fichier volumineux est souvent signe de bonne qualité. Vérification manuelle recommandée.',
        }],
        recommendations: ['Exportez une version allégée (72-150 dpi) pour la vérification automatique. L\'original haute résolution est parfait pour l\'impression.'],
      })
    }

    // ── Fetch file and convert to base64 ──────────────────────────────────────
    const fetchRes = await fetch(effectiveUrl)
    if (!fetchRes.ok) throw new Error(`Impossible de télécharger le fichier: ${fetchRes.status}`)

    const buffer = await fetchRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Vérification taille post-téléchargement (si HEAD n'avait pas de content-length)
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

    const mediaType = (isPDF && !analysis_url)
      ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
      : 'image/jpeg'

    // ── Build context for Claude ──────────────────────────────────────────────
    const cmykContext = cmyk_hint === 'cmyk'
      ? 'IMPORTANT : détection bytes PDF confirme des objets CMYK/DeviceCMYK dans le fichier. Le mode colorimétrique est CMYK.'
      : cmyk_hint === 'rgb'
      ? 'IMPORTANT : détection bytes PDF confirme des objets RGB/DeviceRGB. Le mode colorimétrique est probablement RGB.'
      : null

    const contextParts = [
      `Nom du fichier : ${file_name || 'inconnu'}`,
      analysis_url ? `NOTE : tu analyses un aperçu JPEG de la page 1 du fichier original (le PDF complet est trop volumineux pour transfert direct).` : null,
      cmykContext,
      product_name ? `Produit commandé : ${product_name}` : null,
      dimensions ? `Dimensions commandées : ${dimensions} — le fichier DOIT correspondre (+ fond perdu inclus)` : null,
      product_bleed ? `Fond perdu requis : ${product_bleed} sur chaque côté` : null,
      product_diecut ? `TRACÉ DE DÉCOUPE OBLIGATOIRE pour ce produit (Tom Direct 100% Magenta)` : null,
    ].filter(Boolean).join('\n')

    // ── Call Claude with vision ───────────────────────────────────────────────
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
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

    // Parse JSON robuste
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse Claude invalide — aucun JSON trouvé')

    let jsonStr = jsonMatch[0]
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    let analysis
    try {
      analysis = JSON.parse(jsonStr)
    } catch {
      const strictMatch = raw.match(/(\{(?:[^{}]|(?:\{[^{}]*\}))*\})/)
      if (strictMatch) analysis = JSON.parse(strictMatch[0])
      else throw new Error('Impossible de parser la réponse JSON')
    }
    return NextResponse.json(analysis)

  } catch (err: any) {
    console.error('[analyze-file POST]', err)
    const msg = err?.message || ''
    // Messages d'erreur lisibles pour l'utilisateur
    if (msg.includes('timeout') || msg.includes('AbortError')) {
      return NextResponse.json({ error: 'Analyse trop longue — fichier probablement trop lourd. Essayez avec une version allégée (export 150 dpi).' }, { status: 408 })
    }
    if (msg.includes('too large') || msg.includes('maximum') || msg.includes('context')) {
      return NextResponse.json({ error: 'Fichier trop volumineux pour l\'analyse IA. Exportez une version PDF allégée.' }, { status: 413 })
    }
    return NextResponse.json({ error: `Erreur d'analyse : ${msg || 'erreur interne'}` }, { status: 500 })
  }
}
