import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, keywords, tone, length } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic requis' }, { status: 400 })

    const wordCount = length === 'court' ? '400-600' : length === 'long' ? '1000-1400' : '600-900'
    const toneStr   = tone === 'expert'  ? 'expert et professionnel'
                    : tone === 'simple'  ? 'accessible et pédagogique'
                    : 'chaleureux et professionnel'

    const prompt = `Tu es rédacteur SEO expert pour Comink, imprimerie grand format à Liège (Belgique).
Ton style est ${toneStr}. Public cible : professionnels et entreprises cherchant à faire imprimer des supports grand format.

Écris un article de blog complet sur le sujet suivant :
**${topic}**
${keywords ? `Mots-clés à intégrer naturellement : ${keywords}` : ''}

Structure l'article ainsi (en HTML propre, sans balises html/head/body) :
- Un <h1> accrocheur qui intègre le sujet principal
- 3 à 5 sections avec <h2> et paragraphes <p>
- Des listes <ul><li> quand pertinent
- Une conclusion avec un appel à l'action vers Comink (mention du lien /commande-rapide ou /contact)
- Environ ${wordCount} mots

Puis génère également :
- Un excerpt (2-3 phrases résumant l'article, sans HTML)
- Un seo_title (50-60 car)
- Une seo_description (140-160 car)
- Des seo_keywords (6-8 mots-clés séparés par virgule)
- Un reading_time_min (estimation entière)
- Des tags (2-4 tags courts, tableau)

Réponds UNIQUEMENT en JSON valide :
{
  "title": "...",
  "content": "...",
  "excerpt": "...",
  "seo_title": "...",
  "seo_description": "...",
  "seo_keywords": "...",
  "reading_time_min": 3,
  "tags": ["tag1", "tag2"]
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[generate-article]', err)
    return NextResponse.json({ error: err.message || 'Erreur génération article' }, { status: 500 })
  }
}
