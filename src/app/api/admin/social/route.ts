import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Identité et expertise Comink ───────────────────────────────────────────

const BRAND_CONTEXT = `
IDENTITÉ COMINK :
Imprimerie grand format à Liège (Belgique). Commande 100% en ligne sur comink.eu, devis instantané, livraison rapide toute la Belgique, pose disponible en région liégeoise.
Contact : info@comink.be | +32 4 233 01 38

CATALOGUE COMPLET :
• Extérieur/événementiel : banderoles avec œillets, bâches tendues, kakémonos, roll-ups, totems, panneaux rigides (dibond, forex), affiches grand format
• Signalétique permanente : enseignes, vitrophanie (stickers vitrine découpés ou plein fond), covering véhicule (total ou partiel), décoration murale vinyle
• Événementiel pro : backdrop photo, podiums, stands modulaires, habillage de scène, PLV
• Textile : t-shirts, polos, vestes, tabliers imprimés

AVANTAGES CONCURRENTIELS RÉELS (à mentionner régulièrement) :
• Délais ultra-courts : commande vendredi → livraison lundi possible
• Devis en ligne instantané — pas 48h d'attente
• Encres UV : résistantes aux UV et aux intempéries (3-5 ans extérieur)
• Interlocuteur humain joignable à Liège
• Pose pro disponible en région liégeoise
• Formats sur mesure, pas de minimum de commande
• Fichiers acceptés dans tous formats, accompagnement technique gratuit

SEGMENTS CLIENTS ET BESOINS RÉELS :
• Agences de com → fiabilité absolue, BAT rapide, partenariat long terme, zéro mauvaise surprise
• PME/commerces → visibilité locale, ROI mesurable, prix transparent, commande simple
• Indépendants → premier investissement visibilité, budget maîtrisé, simplicité
• Associations/ASBL → budget serré, occasions ponctuelles (AG, fêtes, marchés de Noël)
• Organisateurs d'événements → date fixe non négociable, fiabilité 100%, volumes importants
• Restaurants/hôtels → renouvellement saisonnier, cohérence charte visuelle
• Professions libérales → sobre, professionnel, discret

TON DE VOIX :
Direct et concret. "Chez nous" plutôt que "notre équipe dédiée". Chiffres réels (dimensions, délais, années de garantie). Référence locale belge bienvenue. Jamais de superlatifs creux.

PHRASES ABSOLUMENT INTERDITES :
"Nous sommes fiers de" / "Solution innovante" / "Équipe dédiée" / "Passionnés par notre métier" / "De haute qualité" / "Des experts à votre service" / "N'hésitez pas à nous contacter"
`

// ─── Expertise sectorielle ───────────────────────────────────────────────────

const SECTOR_EXPERTISE = `
PSYCHOLOGIE D'ACHAT IMPRESSION GRAND FORMAT :
• Déclencheur #1 : un événement à date fixe (inauguration, salon, soldes) → urgence réelle, commander maintenant
• Déclencheur #2 : voir un concurrent mieux signalisé → FOMO, pas question de rester invisible
• Déclencheur #3 : nouveau local ou refonte de charte → investissement global communication visuelle
• Frein #1 : "je ne sais pas si ça vaut le coût" → montrer le ROI (ex : 5 ans de visibilité pour le prix de 2 spots radio)
• Frein #2 : "je ne sais pas préparer mes fichiers" → rassurer sur l'accompagnement technique gratuit

CE QUI GÉNÈRE DE L'ENGAGEMENT DANS CE SECTEUR (par ordre de performance) :
1. Avant/après covering véhicule ou vitrine → très forts partages (transformation visuelle spectaculaire)
2. Coulisses de production : machines en action, processus d'impression, pose en cours → curiosité + confiance
3. Conseil technique : comment choisir son support, résistance UV, préparer ses fichiers → leads qualifiés
4. Cas client anonymisé : "Une boulangerie de Liège avait besoin de..." → preuve sociale puissante
5. Question binaire avec visuel comparatif : "Lequel tu choisirais pour ta vitrine ?" → commentaires
6. Urgence réelle avec résultat : "Commandé hier soir, posé ce matin" → réassurance délais
7. Chiffres concrets : "14m² de vinyle, 3h de pose, résultat impeccable" → crédibilité instantanée

MÉCANIQUE DES ALGORITHMES PAR PLATEFORME :
Facebook : posts avec question finale = 3× plus de commentaires. Vidéos < 60s = portée maximale. Les références locales (Liège, Belgique) améliorent la distribution géographique ciblée.
Instagram : les carrousels génèrent 3× plus de sauvegardes. Reels 7-15 secondes boostés. Hashtags locaux (#liège #belgique #imprimerie) > hashtags génériques.
LinkedIn : accroche forte + retour à la ligne avant "Voir plus" = 5× plus de portée. Témoignages B2B = meilleur taux de conversion. Mardi/mercredi 8h-10h ou 17h-19h.

ANGLES ÉDITORIAUX QUI FONCTIONNENT POUR COMINK :
• ROI chiffré : "1 bâche = 5 ans de visibilité permanente"
• Urgence délais : "Vous avez un événement lundi ? On peut. Envoyez votre fichier maintenant."
• Spécificité locale : référence à Liège, à la Wallonie, au marché belge
• Transformation visuelle : avant/après, résultats concrets avec dimensions
• Démystification technique : rendre l'impression grand format accessible et sans prise de tête
• Saisonnalité : relier les produits aux moments clés (fêtes, soldes, rentrée, événements)
`

// ─── Exemples de posts par plateforme ────────────────────────────────────────

const POST_EXAMPLES: Record<string, string> = {
  instagram: `BONS EXEMPLES INSTAGRAM COMINK (inspire-toi du style, ne copie jamais) :

"4m × 1m. Posée en 20 min. Cette bâche a tourné toute la saison sans broncher ☀️
Devis instantané sur comink.eu"
#imprimerie #grandformat #liège #bâche #signalétique #belgique #événement #covering

"Tu as un événement dans 3 jours et tu as oublié la signalétique ? 😅
On a l'habitude. Envoie ton fichier aujourd'hui → livré demain.
comink.eu"
#urgence #impression #rollup #kakémono #liège

"Ce camion, avant : blanc. Après : identité visuelle complète.
Le covering fait tout le travail de terrain à ta place.
Devis gratuit sur comink.eu"
#covering #vehicule #marquage #liège #communication`,

  facebook: `BONS EXEMPLES FACEBOOK COMINK (inspire-toi du style, ne copie jamais) :

"On vient de terminer 6 vitrines pour une nouvelle enseigne à Liège. Vitrophanie blanche mate, propre, moderne. Résultat ? Les passants s'arrêtent. Tu as un projet ?"

"Petit rappel pratique : pour une banderole extérieure qui tient au vent, prévois des œillets renforcés et un mat de tension. On s'en occupe. Devis sur comink.eu 👌"

"En ce moment on a du covering véhicule toutes les semaines. Les commerciaux qui roulent avec leur véhicule brandé font 40% de notoriété en plus selon leurs retours. Ça mérite réflexion."`,

  linkedin: `BONS EXEMPLES LINKEDIN COMINK (inspire-toi du style, ne copie jamais) :

"Vendredi 17h, un client agence nous envoie un brief pour un event lundi matin.
On n'a pas dit non.
On a adapté la production.
C'est ça notre valeur ajoutée réelle : pas la qualité (tout le monde la promet), mais la réactivité quand ça compte.
Vous gérez des clients exigeants ? Parlons-en. comink.eu"

"Un roll-up bien conçu reste le support B2B au meilleur ROI par euro investi.
85×200cm. Monté en 30 secondes. Transportable partout.
Si vous cherchez un partenaire impression fiable pour vos clients, je suis disponible."

"Observation après 5 ans de travail avec des agences de com belges :
Le brief arrive toujours en urgence.
Ce n'est pas un problème si votre imprimeur a prévu des créneaux d'urgence.
Le nôtre en a. comink.eu"`,
}

// ─── Règles de format par plateforme ─────────────────────────────────────────

const PLATFORM_RULES: Record<string, string> = {
  instagram: `RÈGLES INSTAGRAM (respecter impérativement) :
• 1re phrase : visuel ou résultat concret — PAS le process, PAS l'entreprise
• 2-3 phrases : contexte, bénéfice ou histoire courte
• 1 CTA ultra-court : "comink.eu", "Devis en 2 min", "Lien en bio"
• Saut de ligne, puis 7-10 hashtags : 3 niche (#covering #vitrophanie), 3 locaux (#liège #belgique #liégeois), 3 larges (#communication #marketing #signalétique)
• Longueur texte hors hashtags : 180-280 caractères
• Emojis : 1-2 max, seulement si naturels (pas de 🚀 ou ✨)
• PAS de majuscules excessives, PAS d'emojis en série`,

  facebook: `RÈGLES FACEBOOK (respecter impérativement) :
• Commencer par : un fait concret / une situation réelle / une question directe — JAMAIS "Nous sommes heureux de..."
• Corps : 2-3 phrases, histoire courte ou conseil pratique actionnable
• Fin : question d'engagement OU appel à l'action vers comink.eu
• Longueur : 180-300 caractères
• Hashtags : 0 à 2 max, seulement si très pertinents
• Emojis : 1-2 si naturels, jamais en décoration
• PAS de lien dans le texte (Facebook pénalise) — mettre en commentaire`,

  linkedin: `RÈGLES LINKEDIN (respecter impérativement) :
• 1re ligne : accroche forte qui coupe le flux — situation réelle, chiffre, observation inattendue
• Retour à la ligne après la 1re phrase (pour forcer le "Voir plus")
• Corps : 3-5 lignes courtes avec sauts de ligne, angle B2B (fiabilité, ROI, partenariat, réactivité)
• Pas d'emojis sauf exception très justifiée
• CTA discret en fin : comink.eu ou "contactez-moi"
• Longueur : 300-500 caractères
• Hashtags : 3-4 max, pro (#impression #signalétique #liège #b2b)
• PAS de liste à puces (ça fait catalogue, pas humain)`,
}

const POST_TYPES: Record<string, string> = {
  'showcase : montre un résultat client concret avec dimensions, délai, usage réel': 'Showcase produit',
  'conseil pratique : donne une astuce utile sur comment commander, choisir son support ou préparer ses fichiers': 'Conseil pratique',
  'cas client anonyme : raconte une situation réelle (besoin urgent, projet événementiel, inauguration…)': 'Cas client',
  "question d'engagement : pose une vraie question à la communauté liée à l'impression ou à leur activité": 'Question engagement',
  'coulisses de production : décris ce qui se passe en atelier, le processus, la précision du travail': 'Coulisses',
  'offre ou urgence saisonnière : rentrée, fêtes, été, salon… délai limité pour commander': 'Offre / Urgence',
}

// ─── GET — liste des posts ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ─── POST — générer ou créer manuellement ────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  if (body.action === 'generate') {
    const { platforms = ['facebook', 'instagram', 'linkedin'], theme, image_url, scheduled_at, veille_context } = body

    const posts = []
    for (const platform of platforms) {
      const postTypeLabel = theme
        ? Object.entries(POST_TYPES).find(([k]) => theme.startsWith(k))?.[1] ?? ''
        : ''

      const veilleSection = veille_context
        ? `\n---\nVEILLE DU SECTEUR — OPPORTUNITÉS ACTUELLES :\n${veille_context}\nUtilise ces insights pour rendre le post ultra-pertinent et ancré dans le moment présent.\n---\n`
        : ''

      const prompt = `${BRAND_CONTEXT}
${SECTOR_EXPERTISE}
${veilleSection}
FORMAT ET RÈGLES STRICTES POUR ${platform.toUpperCase()} :
${PLATFORM_RULES[platform]}

---
EXEMPLES DE RÉFÉRENCE (inspire-toi du style et du ton, ne copie jamais le contenu) :
${POST_EXAMPLES[platform]}

---
ANGLE ET CONTEXTE DE CE POST :
${theme
  ? `Type demandé : ${postTypeLabel || theme}
  Détail : ${theme}`
  : 'Aucun angle précis → choisis librement parmi : showcase produit, conseil technique, coulisses, cas client, question d\'engagement. Évite les généralités.'}
${image_url
  ? '→ Un visuel sera joint à ce post. Le texte doit compléter et enrichir l\'image, jamais la décrire littéralement.'
  : '→ Pas de visuel. Le texte seul doit être suffisamment évocateur et concret.'}

---
CONSIGNE FINALE :
Tu es le community manager de Comink. Écris UN SEUL post ${platform} prêt à publier maintenant.
Commence directement par le contenu du post. Zéro guillemets, zéro titre, zéro "Voici le post :", zéro explication.
Le post doit être immédiatement utilisable tel quel, sans retouche.`

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = (msg.content[0] as { type: string; text?: string }).text?.trim() ?? ''

      const { data } = await supabase
        .from('social_posts')
        .insert({
          platform,
          content,
          image_url: image_url || null,
          scheduled_at: scheduled_at || null,
          status: 'draft',
          generated_by: 'ai',
        })
        .select()
        .single()

      if (data) posts.push(data)
    }

    return NextResponse.json({ posts })
  }

  // Post manuel
  const { platform, content, image_url, scheduled_at } = body
  const { data, error } = await supabase
    .from('social_posts')
    .insert({ platform, content, image_url: image_url || null, scheduled_at: scheduled_at || null, status: 'draft', generated_by: 'manual' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── PATCH — approuver / modifier / rejeter ───────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('social_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── DELETE — supprimer un post ───────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabase.from('social_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
