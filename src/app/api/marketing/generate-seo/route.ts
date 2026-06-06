import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      description,
      category,
      product_type,
      finitions,
      delai_options,
      standard_sizes,
      min_width_cm, max_width_cm,
      min_height_cm, max_height_cm,
      price_per_m2,
    } = body

    // Résumé des finitions disponibles
    const finitionsStr = Array.isArray(finitions) && finitions.length
      ? finitions.map((f: any) => f.name || f).filter(Boolean).join(', ')
      : null

    // Tailles standard
    const sizesStr = Array.isArray(standard_sizes) && standard_sizes.length
      ? standard_sizes.map((s: any) => `${s.width_cm}×${s.height_cm} cm`).join(', ')
      : null

    // Délais disponibles
    const delaisStr = Array.isArray(delai_options) && delai_options.length
      ? delai_options.map((d: any) => `${d.days}j${d.name ? ` (${d.name})` : ''}`).join(', ')
      : null

    const productContext = [
      `Nom du produit : ${name}`,
      description ? `Description actuelle : ${description}` : null,
      category ? `Catégorie : ${category}` : null,
      product_type === 'custom' ? `Format : sur mesure` : `Format : tailles standard`,
      min_width_cm && max_width_cm ? `Largeur : ${min_width_cm}–${max_width_cm} cm` : null,
      min_height_cm && max_height_cm ? `Hauteur : ${min_height_cm}–${max_height_cm} cm` : null,
      sizesStr ? `Tailles standard : ${sizesStr}` : null,
      price_per_m2 ? `Prix : à partir de ${price_per_m2}€/m²` : null,
      finitionsStr ? `Finitions disponibles : ${finitionsStr}` : null,
      delaisStr ? `Délais : ${delaisStr}` : null,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert SEO spécialisé dans l'imprimerie grand format belge.
Tu travailles pour Comink, imprimerie basée à Liège (Belgique).

Voici les informations sur le produit :
${productContext}

Génère les éléments SEO suivants en français :

1. **seo_title** : Titre SEO (balise <title>) — 50-60 caractères max.
   Inclure le nom du produit, "Liège" ou "Belgique", et un bénéfice clé.
   Exemple de format : "[Produit] sur mesure — Imprimerie Comink Liège"

2. **seo_description** : Meta description — 140-160 caractères max.
   Doit donner envie de cliquer : bénéfice principal + appel à l'action + localisation.

3. **seo_keywords** : 6-8 mots-clés pertinents séparés par des virgules.
   Inclure des variantes (pluriel, synonymes) et des termes locaux (Liège, Belgique).

4. **description_suggestion** : Courte description produit optimisée pour le SEO (2-3 phrases, max 300 caractères).
   Naturelle, orientée bénéfices client, avec mots-clés intégrés organiquement.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires :
{
  "seo_title": "...",
  "seo_description": "...",
  "seo_keywords": "...",
  "description_suggestion": "..."
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON — nettoyer les éventuels blocs markdown
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[generate-seo]', err)
    return NextResponse.json({ error: err.message || 'Erreur génération SEO' }, { status: 500 })
  }
}
