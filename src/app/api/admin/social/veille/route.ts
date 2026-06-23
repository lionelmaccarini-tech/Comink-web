import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const now = new Date()
  const mois = now.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
  const jour = now.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })

  const prompt = `Tu es un expert senior en stratégie de contenu digital pour le secteur de l'impression grand format en Belgique. Tu as 15 ans d'expérience, tu connais parfaitement les cycles saisonniers, les événements professionnels belges, et ce qui performe sur les réseaux dans les secteurs B2B imprimerie/signalétique/communication visuelle.

AUJOURD'HUI : ${jour}

MISSION : Génère une veille stratégique ultra-actionnable pour Comink (imprimerie grand format à Liège, Belgique — comink.eu). Cette veille sera utilisée immédiatement par l'IA pour créer des posts réseaux sociaux performants.

CONTEXTE COMINK : Produits = banderoles, bâches, covering véhicule et vitrine, kakémonos, roll-ups, enseignes, vitrophanie, podiums, backdrop photo, PLV. Clients = agences de com, PME, commerces, associations, restaurants, organisateurs d'événements. Livraison rapide Belgique, pose région liégeoise.

Analyse la période actuelle (${mois}), les événements habituellement attendus à cette saison en Belgique, les tendances du contenu qui performe sur les réseaux pour ce type d'activité, et génère la veille.

Réponds UNIQUEMENT avec ce JSON valide (aucun texte avant ou après, aucun markdown) :

{
  "opportunites": [
    {
      "titre": "Titre court et accrocheur (max 8 mots)",
      "contexte": "Pourquoi c'est une opportunité EN CE MOMENT (1 phrase)",
      "angle_post": "Comment Comink peut en parler concrètement dans un post (1 phrase actionnable)",
      "exemple_accroche": "Exemple d'accroche réelle prête à utiliser",
      "plateformes": ["facebook"],
      "urgence": "haute"
    }
  ],
  "tendances_chaudes": [
    {
      "tendance": "La tendance",
      "impact_comink": "Comment ça touche les produits Comink",
      "angle_contenu": "L'angle contenu à prendre"
    }
  ],
  "calendrier_proche": [
    {
      "evenement": "Événement ou période",
      "date": "Timing",
      "angle_marketing": "Opportunité pour Comink",
      "urgence_post": "Poster X jours avant"
    }
  ],
  "formats_performants": [
    {
      "type": "Nom du format",
      "pourquoi_ca_marche": "Raison courte",
      "exemple": "Exemple concret pour Comink"
    }
  ],
  "insights_algorithme": {
    "facebook": "Ce qui booste la portée sur Facebook en ce moment",
    "instagram": "Ce qui booste la portée sur Instagram en ce moment",
    "linkedin": "Ce qui booste la portée sur LinkedIn en ce moment"
  },
  "a_eviter": ["Ce qui pénalise les posts en ce moment"],
  "conseil_strategique": "Un insight stratégique majeur sur ce qu'il faut faire dans les 30 prochains jours pour maximiser la présence sociale de Comink"
}

Génère 4-6 opportunités, 3-4 tendances, 3-4 événements calendrier, 4-5 formats. Sois ultra-concret et spécifique au contexte belge et à l'impression grand format.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (msg.content[0] as { type: string; text?: string }).text?.trim() ?? '{}'
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const data = JSON.parse(cleaned)
    return NextResponse.json({ ...data, generated_at: now.toISOString() })
  } catch {
    return NextResponse.json({ error: 'Erreur parsing', raw: cleaned }, { status: 500 })
  }
}
