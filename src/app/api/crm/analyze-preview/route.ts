import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

function getAnthropicKey(): string {
  const envKey = 'ANTHROPIC_API_KEY'
  const fromEnv = (process.env as Record<string, string | undefined>)[envKey]
  if (fromEnv) return fromEnv
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const line = content.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='))
    if (line) return line.split('=').slice(1).join('=').trim()
  } catch {}
  return ''
}

const SYSTEM = `Tu es un expert en prépresse et impression grand format.
Tu analyses un APERÇU (miniature JPEG) d'un fichier client pour vérifier sa conformité avant impression.

Retourne UNIQUEMENT ce JSON (aucun texte avant/après) :

{
  "score": 85,
  "status": "ok",
  "summary": "1-2 phrases résumant les points clés",
  "checks": [
    {
      "id": "string",
      "label": "string",
      "status": "warning",
      "message": "constat court (1 phrase)",
      "detail": "explication technique précise, valeurs si possible"
    }
  ],
  "recommendations": ["action concrète 1", "action 2"]
}

Critères OBLIGATOIRES à évaluer (un check par critère) :

1. **dimensions** (id: "dimensions")
   - Extrait les dimensions depuis le nom de fichier si présentes (ex: "bache 240x120" → 240×120 cm)
   - Sinon indique "Non précisées — à vérifier avec le bon de commande"
   - detail: dimensions détectées ou "Non trouvées dans le nom de fichier"

2. **resolution** (id: "resolution")
   - Taille fichier > 100MB = ok haute résolution
   - 10-100MB = probablement ok selon format et dimensions
   - < 5MB pour grand format = warning
   - Visible flou/pixelisation dans l'aperçu = error
   - detail: taille fichier + estimation qualité

3. **color_mode** (id: "color_mode")
   - Analyse les couleurs dans l'aperçu
   - Couleurs vives/saturées/néon → RVB probable (error — doit être CMJN)
   - Couleurs légèrement désaturées/mates → CMJN probable (ok)
   - Noir pur sur fond blanc → impossible à déterminer (warning)
   - detail: observation des couleurs + recommandation

4. **fonts** (id: "fonts")
   - Cherche si du texte est visible dans l'aperçu
   - Texte présent : avertir que les polices doivent être vectorisées (tracés) ou embarquées
   - Impossible de confirmer depuis un aperçu → toujours mettre "warning" si texte visible
   - detail: "Texte détecté — vérifiez que toutes les polices sont converties en tracés (outlines) ou embarquées dans le PDF"
   - Pas de texte visible → status "ok", message "Aucun texte apparent"

5. **images_embedded** (id: "images_embedded")
   - Y a-t-il des photos/images bitmap dans le visuel ?
   - Si oui : warning — vérifier que les images sont en 150+ dpi à la taille finale
   - Flou visible sur les images → error
   - detail: "Images détectées — résolution à vérifier dans le fichier source (min. 150 dpi à la taille finale d'impression)"

6. **cut_contour** (id: "cut_contour")
   - Un tracé de découpe (Tom Direct) est une ligne en Magenta 100% (ou couleur spot dédiée) indiquant où découper
   - Cherche une ligne fine rose/magenta en bordure ou une forme de découpe
   - Présent = ok
   - Absent = warning si c'est un produit avec découpe (sticker, adhésif, forme spéciale)
   - Pour bâches/banderoles standard = pas nécessaire (ok par défaut)
   - detail: ce que tu vois ou ne vois pas comme tracé de découpe

7. **bleed** (id: "bleed")
   - Le fond perdu (3-5mm) est-il présent ? Les éléments de fond vont-ils jusqu'au bord ?
   - Bord blanc net = pas de fond perdu (warning)
   - Éléments jusqu'au bord = fond perdu présent (ok)
   - detail: observation des bords du document

8. **text_legibility** (id: "text_legibility")
   - Le texte est-il lisible, suffisamment grand, pas trop proche des bords ?
   - Texte trop petit ou trop en bordure = warning
   - detail: observations sur la lisibilité et la sécurité des textes

RÈGLES :
- status global "error" si au moins un check critique est "error" (color_mode RVB, résolution insuffisante)
- status global "warning" si au moins un "warning"
- score 80-100 = tout ok, 60-79 = warnings mineurs, 40-59 = corrections requises, < 40 = erreurs critiques
- Chaque "detail" doit être précis et actionnable, pas vague
- Ne jamais mettre checks: null ou checks: undefined — toujours un tableau même vide
Réponds UNIQUEMENT avec le JSON valide, sans markdown, sans texte avant ou après.`

// ── POST /api/crm/analyze-preview ────────────────────────────────────────────
// Analyse un aperçu JPEG généré côté client (fichiers très lourds OK)
export async function POST(req: NextRequest) {
  try {
    const apiKey = getAnthropicKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Service d\'analyse temporairement indisponible.' },
        { status: 503 }
      )
    }

    const { preview_base64, file_name, file_size_mb, product_name, dimensions } = await req.json()

    if (!preview_base64) {
      return NextResponse.json({ error: 'preview_base64 requis' }, { status: 400 })
    }

    // Vérifier taille du preview (max 5MB en base64 ≈ 3.75MB image)
    if (preview_base64.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: `Aperçu trop lourd (${Math.round(preview_base64.length / 1024)}KB). Essayez un fichier plus simple.` }, { status: 413 })
    }

    console.log('[analyze-preview] file:', file_name, '| preview size:', Math.round(preview_base64.length / 1024), 'KB')

    const client = new Anthropic({ apiKey })

    const contextParts = [
      `Nom du fichier : ${file_name || 'inconnu'}`,
      file_size_mb ? `Taille fichier original : ${file_size_mb} MB` : null,
      product_name ? `Produit : ${product_name}` : null,
      dimensions ? `Dimensions finales : ${dimensions}` : null,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: preview_base64 },
          } as any,
          {
            type: 'text',
            text: `Analyse cet aperçu de fichier pour impression grand format.\n\nContexte:\n${contextParts}`,
          },
        ],
      }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Extraction + nettoyage robuste du JSON Claude
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse Claude invalide — aucun JSON trouvé')

    // Nettoyer virgules traînantes et commentaires avant parsing
    const jsonStr = jsonMatch[0]
      .replace(/,(\s*[}\]])/g, '$1')

    let analysis
    try {
      analysis = JSON.parse(jsonStr)
    } catch (parseErr) {
      // Dernier recours : extraire uniquement le premier objet JSON valide
      const strictMatch = raw.match(/(\{(?:[^{}]|(?:\{[^{}]*\}))*\})/)
      if (strictMatch) {
        analysis = JSON.parse(strictMatch[0])
      } else {
        throw new Error(`JSON invalide : ${(parseErr as Error).message}`)
      }
    }

    return NextResponse.json(analysis)
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Erreur inconnue'
    console.error('[analyze-preview POST]', msg, err)
    return NextResponse.json({ error: `Erreur d'analyse : ${msg}` }, { status: 500 })
  }
}
