import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { generateQuoteNumber } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

// Turbopack inlines process.env at compile time — workaround: read .env.local at runtime
function getAnthropicKey(): string {
  // 1. Try runtime process.env (works in production / Vercel)
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  // 2. Fallback: parse .env.local directly (dev server Turbopack bug workaround)
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const content = fs.readFileSync(envPath, 'utf8')
    const line = content.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='))
    if (line) return line.split('=').slice(1).join('=').trim()
  } catch {}
  return ''
}

function getClient() {
  return new Anthropic({ apiKey: getAnthropicKey() })
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description:
      'Recherche des produits dans le catalogue Comink. Retourne la liste des produits correspondants avec leurs prix et options.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Mot-clé de recherche (ex: "bâche", "roll-up", "adhésif")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_crm_lead',
    description:
      "Crée un lead/devis dans le CRM pour qu'un commercial prenne contact avec le client. À utiliser quand le client a un besoin précis ou complexe qui nécessite l'intervention humaine.",
    input_schema: {
      type: 'object' as const,
      properties: {
        client_name: { type: 'string', description: 'Nom complet du client' },
        client_email: { type: 'string', description: 'Email du client' },
        client_company: { type: 'string', description: 'Société du client (optionnel)' },
        client_phone: { type: 'string', description: 'Téléphone du client (optionnel)' },
        notes: {
          type: 'string',
          description: 'Description du besoin du client, résumé de la conversation',
        },
        source: { type: 'string', description: 'Toujours "chat_angelo"' },
      },
      required: ['client_name', 'client_email', 'notes'],
    },
  },
  {
    name: 'get_my_quotes',
    description:
      "Récupère la liste des devis du client connecté. Utilise cet outil quand le client demande à voir ses devis, leur statut, ou veut savoir ce qui est en attente.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'validate_quote',
    description:
      "Valide (accepte) un devis du client connecté et le prépare pour passer commande. Retourne une commande rapide pré-remplie avec les articles et prix du devis. À utiliser quand le client dit 'je valide', 'je veux commander ce devis', 'accepter le devis DEV-XXXX'.",
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_number: {
          type: 'string',
          description: 'Numéro du devis à valider (ex: "DEV-2606-9127")',
        },
      },
      required: ['quote_number'],
    },
  },
  {
    name: 'get_my_orders',
    description:
      "Récupère la liste des commandes passées par le client connecté. Utilise cet outil quand le client demande le statut de ses commandes.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_blog',
    description:
      "Recherche dans les articles du blog Comink. Utilise cet outil quand le client pose une question technique (pose, matériaux, conseils) ou qu'un article de blog pourrait l'aider. Retourne les articles pertinents avec titre, extrait et lien.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Mots-clés à rechercher (ex: "poser adhésif", "choisir bâche", "roll-up salon")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_knowledge',
    description:
      "Recherche dans la base de connaissances interne Comink (FAQ, infos produits, délais, pose, etc.). À utiliser EN PREMIER avant de répondre à une question technique ou logistique pour s'assurer d'avoir les informations exactes.",
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Question ou mots-clés à rechercher',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_knowledge',
    description:
      "Sauvegarde une information utile et générique dans la base de connaissances pour améliorer les futures réponses. N'utilise cet outil QUE pour des informations génériques sur les produits/processus Comink. NE JAMAIS inclure de données client (noms, emails, numéros de devis, montants). Soumis à validation admin.",
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Catégorie : produits | matériaux | formats | finitions | délais | prix | commande | livraison | pose | faq | general',
        },
        question: {
          type: 'string',
          description: 'Question générique (sans données client)',
        },
        answer: {
          type: 'string',
          description: 'Réponse précise et générique',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Mots-clés pour faciliter la recherche future',
        },
      },
      required: ['category', 'question', 'answer'],
    },
  },
  {
    name: 'transform_to_commande_rapide',
    description:
      "Transforme une liste d'articles (issus d'un fichier Excel/CSV analysé) en commande rapide Comink. Chaque article doit avoir été matchés à un product_id via search_products. Appelle cet outil UNE SEULE FOIS avec tous les articles en même temps.",
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          description: 'Liste des articles de la commande',
          items: {
            type: 'object',
            properties: {
              product_id:   { type: 'string',  description: 'ID du produit Comink (obtenu via search_products)' },
              product_name: { type: 'string',  description: 'Nom du produit tel qu\'affiché dans le fichier' },
              quantity:     { type: 'number',  description: 'Quantité' },
              width_cm:     { type: 'number',  description: 'Largeur en cm (null si non applicable)' },
              height_cm:    { type: 'number',  description: 'Hauteur en cm (null si non applicable)' },
              reference:    { type: 'string',  description: 'Référence client optionnelle' },
            },
            required: ['product_id', 'product_name', 'quantity'],
          },
        },
        summary: {
          type: 'string',
          description: 'Résumé humain de la commande (ex: "3 bâches + 2 roll-ups")',
        },
      },
      required: ['items', 'summary'],
    },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────
interface UserCtx { user_id?: string; user_email?: string }

async function runTool(
  name: string,
  input: Record<string, unknown>,
  userCtx?: UserCtx,
): Promise<string> {
  if (name === 'search_products') {
    const supabase = await createServiceClient()
    const q = (input.query as string) || ''
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, description, category')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .eq('active', true)
      .limit(5)
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucun produit trouvé pour cette recherche.'
    return JSON.stringify(
      data.map((p) => ({
        name: p.name,
        category: p.category,
        url: `https://comink.be/produit/${p.slug}`,
        description: p.description?.slice(0, 120),
      })),
    )
  }

  if (name === 'search_blog') {
    const supabase = await createServiceClient()
    const q = (input.query as string) || ''
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    // Build OR filter across title, excerpt, content, tags
    const filters = terms.flatMap(t => [
      `title.ilike.%${t}%`,
      `excerpt.ilike.%${t}%`,
      `tags.cs.{${t}}`,
    ]).join(',')
    const { data, error } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, tags, published_at')
      .eq('published', true)
      .or(filters.length ? filters : 'published.eq.true')
      .order('published_at', { ascending: false })
      .limit(5)
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucun article trouvé pour cette recherche.'
    return JSON.stringify(data.map(p => ({
      titre: p.title,
      extrait: p.excerpt?.slice(0, 200),
      tags: p.tags,
      url: `https://comink.be/blog/${p.slug}`,
    })))
  }

  if (name === 'search_knowledge') {
    const supabase = await createServiceClient()
    const q = (input.query as string) || ''
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5)
    // Full-text search + keyword search
    const filters = terms.flatMap(t => [
      `question.ilike.%${t}%`,
      `answer.ilike.%${t}%`,
      `keywords.cs.{${t}}`,
    ]).join(',')
    const { data, error } = await supabase
      .from('angelo_knowledge')
      .select('category, question, answer, keywords')
      .eq('is_active', true)
      .eq('approved', true)
      .or(filters.length ? filters : 'is_active.eq.true')
      .limit(5)
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucune information trouvée dans la base de connaissances.'
    return JSON.stringify(data.map(k => ({
      categorie: k.category,
      question: k.question,
      reponse: k.answer,
    })))
  }

  if (name === 'save_knowledge') {
    // Sécurité : vérifier qu'aucune donnée client n'est présente
    const q = (input.question as string) || ''
    const a = (input.answer as string) || ''
    const combined = (q + ' ' + a).toLowerCase()
    const personalDataPatterns = [/@\w+\.\w+/, /\bdev-\d+/i, /\d{2}\/\d{2}\/\d{4}/, /\b\d{3,}\s*€/]
    for (const pat of personalDataPatterns) {
      if (pat.test(combined)) {
        return 'Refusé : la connaissance semble contenir des données personnelles ou un numéro de devis. Reformule de manière générique.'
      }
    }
    const supabase = await createServiceClient()
    const { error } = await supabase.from('angelo_knowledge').insert({
      category:  (input.category as string) || 'general',
      question:  q.trim(),
      answer:    a.trim(),
      keywords:  Array.isArray(input.keywords) ? input.keywords : [],
      source:    'conversation',
      approved:  false, // Doit être validé par un admin
      is_active: false,
    })
    if (error) return `Erreur lors de la sauvegarde: ${error.message}`
    return 'Connaissance soumise pour validation admin. Elle sera disponible après approbation.'
  }

  if (name === 'transform_to_commande_rapide') {
    const rawItems = (input.items as Record<string, unknown>[]) || []
    const supabase = await createServiceClient()

    // Fetch product details for each product_id
    const productIds = [...new Set(rawItems.map(i => i.product_id as string).filter(Boolean))]
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, price_per_m2, price_flat, finitions, delai_options, sides_finitions, standard_sizes, image_url, bleed_mm, min_width_cm, min_height_cm, vat_rate')
      .in('id', productIds)

    const productMap: Record<string, Record<string, unknown>> = {}
    if (products) {
      for (const p of products) productMap[p.id] = p as Record<string, unknown>
    }

    // Build cart-compatible items
    const cartItems = rawItems
      .filter(i => i.product_id && productMap[i.product_id as string])
      .map(i => {
        const p = productMap[i.product_id as string]
        const qty = Number(i.quantity) || 1
        const w = i.width_cm  ? Number(i.width_cm)  : null
        const h = i.height_cm ? Number(i.height_cm) : null

        // Basic price calculation
        let unitPrice = 0
        if (p.price_per_m2 && w && h) {
          unitPrice = Number(p.price_per_m2) * (w / 100) * (h / 100)
        } else if (p.price_flat) {
          unitPrice = Number(p.price_flat)
        }

        return {
          product_id:        p.id,
          product:           p,
          quantity:          qty,
          width_cm:          w,
          height_cm:         h,
          unit_price:        Math.round(unitPrice * 100) / 100,
          total_price:       Math.round(unitPrice * qty * 100) / 100,
          selectedFinitions: {},
          selectedDelai:     null,
          selectedSides:     {},
          _from_angelo:      true,
          _reference:        (i.reference as string) || undefined,
        }
      })

    const missing = rawItems.filter(i => !productMap[i.product_id as string])
    const missingNames = missing.map(i => i.product_name).join(', ')

    // Encode cart items as base64 to pass via SSE
    const encoded = Buffer.from(JSON.stringify(cartItems)).toString('base64')

    // Return a special marker the SSE loop will detect
    return `__COMMANDE_RAPIDE__:${encoded}:${(input.summary as string) || ''}${missingNames ? ` (articles non trouvés: ${missingNames})` : ''}`
  }

  // ── Outils nécessitant le contexte utilisateur ──────────────────────────────
  if (name === 'get_my_quotes') {
    if (!userCtx?.user_id && !userCtx?.user_email) return 'Utilisateur non connecté — impossible de récupérer les devis.'
    const supabase = await createServiceClient()
    let query = supabase
      .from('quotes')
      .select('id, quote_number, reference, items, subtotal, total, status, pipeline_stage, created_at, valid_until, public_token')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10)
    if (userCtx.user_id && userCtx.user_email) {
      query = query.or(`user_id.eq.${userCtx.user_id},client_email.eq.${userCtx.user_email}`)
    } else if (userCtx.user_id) {
      query = query.eq('user_id', userCtx.user_id)
    } else {
      query = query.eq('client_email', userCtx.user_email!)
    }
    const { data, error } = await query
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucun devis trouvé.'
    const fmt = (n: number) => `${n.toFixed(2)} €`
    const statusLabel: Record<string, string> = {
      draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', cancelled: 'Annulé',
    }
    const stageLabel: Record<string, string> = {
      lead: 'Lead', quoted: 'Envoyé', won: 'Gagné', lost: 'Perdu',
    }
    return JSON.stringify(data.map(q => ({
      id: q.id,
      numero: q.quote_number,
      reference: q.reference,
      total: fmt(q.total ?? 0),
      statut: statusLabel[q.status] ?? q.status,
      pipeline: stageLabel[q.pipeline_stage] ?? q.pipeline_stage,
      date: new Date(q.created_at).toLocaleDateString('fr-BE'),
      valide_jusqu: q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-BE') : null,
      nb_articles: Array.isArray(q.items) ? q.items.length : 0,
      peut_valider: q.pipeline_stage !== 'won' && q.status !== 'accepted',
      public_token: q.public_token,
    })))
  }

  if (name === 'validate_quote') {
    if (!userCtx?.user_id && !userCtx?.user_email) return 'Utilisateur non connecté — impossible de valider ce devis.'
    const quoteNumber = (input.quote_number as string)?.trim()
    if (!quoteNumber) return 'Numéro de devis manquant.'

    const supabase = await createServiceClient()
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('quote_number', quoteNumber)
    if (userCtx.user_id && userCtx.user_email) {
      query = query.or(`user_id.eq.${userCtx.user_id},client_email.eq.${userCtx.user_email}`)
    } else if (userCtx.user_id) {
      query = query.eq('user_id', userCtx.user_id)
    } else {
      query = query.eq('client_email', userCtx.user_email!)
    }
    const { data: quote, error } = await query.single()
    if (error || !quote) return `Devis ${quoteNumber} introuvable ou non autorisé.`
    if (quote.pipeline_stage === 'won' || quote.status === 'accepted') {
      return `Le devis ${quoteNumber} a déjà été validé.`
    }

    // Fetcher les produits
    const items: Record<string, unknown>[] = Array.isArray(quote.items) ? quote.items : []
    const productIds = [...new Set(
      items.map(i => i.product_id).filter((id): id is string => typeof id === 'string' && !!id)
    )]
    const productMap: Record<string, Record<string, unknown>> = {}
    if (productIds.length > 0) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, category, product_type, vat_rate, price_per_m2, price_flat, finitions, delai_options, sides_finitions, standard_sizes, image_url, bleed_mm, min_width_cm, min_height_cm')
        .in('id', productIds)
      if (prods) for (const p of prods) productMap[p.id] = p as Record<string, unknown>
    }

    const cartItems = items.map((line) => {
      const unitPrice = (line.unit_price_ht ?? line.unit_price ?? 0) as number
      const qty       = (line.quantity ?? 1) as number
      const totalLine = (line.total_price ?? line.total ?? qty * unitPrice) as number
      const productNameFallback = ((line.description ?? line.product_name ?? line.name ?? '') as string).trim()
      const pid = line.product_id as string | undefined
      let product: Record<string, unknown>
      if (pid && productMap[pid]) {
        const db = productMap[pid]
        product = { ...db, name: (db.name as string) || productNameFallback || 'Article' }
      } else {
        product = (line.product as Record<string, unknown>) ?? { name: productNameFallback || 'Article', id: pid ?? null }
      }
      return {
        product_id: pid ?? null, product, quantity: qty,
        width_cm: line.width_cm ?? null, height_cm: line.height_cm ?? null,
        unit_price: unitPrice, total_price: totalLine,
        selectedFinitions: (line.selectedFinitions as Record<string, string | string[]>) ?? {},
        selectedDelai: line.selectedDelai ?? null,
        selectedSides: (line.selectedSides as Record<string, string[]>) ?? {},
        _from_quote: true, _quote_id: quote.id, _quote_number: quote.quote_number,
      }
    })

    // Marquer le devis comme accepté
    await supabase.from('quotes').update({
      status: 'accepted', pipeline_stage: 'won', updated_at: new Date().toISOString(),
    }).eq('id', quote.id)
    try {
      await supabase.from('crm_activities').insert({
        quote_id: quote.id, type: 'status_change',
        content: `Devis accepté via Angelo (client connecté)`,
        old_stage: quote.pipeline_stage, new_stage: 'won',
      })
    } catch {}

    const encoded = Buffer.from(JSON.stringify(cartItems)).toString('base64')
    const summary = `${cartItems.length} article${cartItems.length > 1 ? 's' : ''} — ${quote.quote_number} — ${(quote.total ?? 0).toFixed(2)} €`
    return `__COMMANDE_RAPIDE__:${encoded}:${summary}`
  }

  if (name === 'get_my_orders') {
    if (!userCtx?.user_id && !userCtx?.user_email) return 'Utilisateur non connecté — impossible de récupérer les commandes.'
    const supabase = await createServiceClient()
    let query = supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, delivery_method')
      .order('created_at', { ascending: false })
      .limit(10)
    if (userCtx.user_id && userCtx.user_email) {
      query = query.or(`user_id.eq.${userCtx.user_id},client_email.eq.${userCtx.user_email}`)
    } else if (userCtx.user_id) {
      query = query.eq('user_id', userCtx.user_id)
    } else {
      query = query.eq('client_email', userCtx.user_email!)
    }
    const { data, error } = await query
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucune commande trouvée.'
    const statusLabel: Record<string, string> = {
      pending_wire: 'En attente virement', pending: 'En attente', in_production: 'En production',
      shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
    }
    return JSON.stringify(data.map(o => ({
      numero: o.order_number,
      statut: statusLabel[o.status] ?? o.status,
      total: `${(o.total ?? 0).toFixed(2)} €`,
      date: new Date(o.created_at).toLocaleDateString('fr-BE'),
      livraison: o.delivery_method,
    })))
  }

  if (name === 'create_crm_lead') {
    try {
      const clientName  = (input.client_name  as string) || ''
      const clientEmail = (input.client_email as string) || ''
      if (!clientName || !clientEmail) {
        return 'Pour créer un lead, j\'ai besoin du nom et de l\'email du client. Peux-tu me les donner ?'
      }
      const supabase = await createServiceClient()
      const quote_number = generateQuoteNumber()
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          quote_number,
          client_name:      clientName,
          client_email:     clientEmail,
          client_company:   (input.client_company as string) || null,
          client_phone:     (input.client_phone   as string) || null,
          notes:            (input.notes           as string) || null,
          source:           'chat_angelo',
          pipeline_stage:   'lead',
          status:           'draft',
          items:            [],
          subtotal:         0,
          tax:              0,
          total:            0,
          probability:      20,
          delivery_method:  'pickup',
          delivery_cost:    0,
          delivery_country: 'BE',
          blind_shipping:   false,
        })
        .select('quote_number')
        .single()
      if (error) {
        console.error('[angelo create_crm_lead]', error)
        return `Erreur lors de la création du lead: ${error.message}`
      }
      return `Lead créé avec succès (réf. ${data.quote_number}). Un de nos conseillers va contacter ${clientName} très prochainement.`
    } catch (err: any) {
      console.error('[angelo create_crm_lead]', err)
      return `Erreur technique lors de la création du lead: ${err?.message ?? 'inconnue'}`
    }
  }

  return 'Outil inconnu'
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `Tu es Angelo Comink, l'assistant virtuel de Comink, une imprimerie grand format basée à Liège, en Belgique.

Tu aides les clients à :
- Découvrir les produits d'impression (bâches, banderoles, roll-up, adhésifs, enseignes, etc.)
- Obtenir des informations sur les prix, délais, matériaux et options de finition
- Trouver le produit adapté à leur besoin
- Commander en ligne sur comink.be
- Transformer un fichier Excel/CSV de commande en commande rapide
- Consulter leurs devis et commandes passées
- Valider un devis pour passer commande

Ton style : professionnel mais chaleureux, concis, en français belge naturel. Tu tutoies les clients uniquement s'ils le font en premier.

ACCÈS COMPTE CLIENT (si le client est connecté) :
- get_my_quotes : liste ses devis avec statut, montant et date
- validate_quote : valide un devis (l'accepte) et prépare la commande — le client n'a plus qu'à confirmer
- get_my_orders : liste ses commandes passées avec statut de production/livraison
Si le contexte utilisateur est disponible (user_id ou user_email), ces outils fonctionnent automatiquement.

PRIORITÉ DE RECHERCHE D'INFORMATIONS :
1. search_knowledge en PREMIER pour toute question technique (matériaux, délais, pose, formats, prix)
2. search_blog si l'info n'est pas dans la knowledge base ou pour pointer vers un article détaillé
3. search_products pour identifier le bon produit avec son ID
4. Si tu apprends quelque chose d'utile et générique en cours de conversation, sauvegarde-le avec save_knowledge (JAMAIS de données client — nom, email, montant, numéro de devis)

Règles importantes :
- Pour chaque question technique, consulte d'abord search_knowledge avant de répondre de mémoire.
- Si un client demande à voir ses devis ou commandes, utilise get_my_quotes ou get_my_orders directement.
- Si un client veut valider/accepter un devis (il dit "je valide", "je veux commander", "accepter DEV-xxxx"), utilise validate_quote avec le numéro de devis.
- Si un client a un besoin précis (quantité, dimensions, événement), propose-lui de créer un devis personnalisé via l'outil create_crm_lead (demande d'abord son nom et email s'ils ne sont pas connus).
- Pour les questions sur des produits spécifiques, utilise search_products.
- Ne donne jamais de prix fermes sans passer par le devis — les prix varient selon les dimensions et quantités.
- Si un article de blog peut aider le client, mentionne-le avec son lien.
- Si tu ne sais pas, dis-le honnêtement et propose de créer un lead pour qu'un commercial rappelle.
- Site web : https://comink.be — catalogue en ligne sur https://comink.be/catalogue — blog : https://comink.be/blog

CONFIDENTIALITÉ : Ne jamais partager des informations d'un client à un autre. Les outils get_my_quotes/get_my_orders sont strictement filtrés par compte client connecté. La base de connaissances ne contient que des informations génériques sur les produits et processus Comink.

GESTION DES FICHIERS DE COMMANDE (Excel/CSV) :
Quand un client partage le contenu d'un fichier de commande (sous forme de texte CSV ou tableau) :
1. Analyse les colonnes et identifie : produit, quantité, largeur (cm), hauteur (cm), référence
2. Pour chaque type de produit unique, utilise search_products pour trouver l'ID Comink correspondant
3. Une fois TOUS les produits matchés, appelle transform_to_commande_rapide UNE SEULE FOIS avec tous les articles
4. Le système ouvrira automatiquement le formulaire de commande rapide pré-rempli
5. Si une colonne est ambiguë (ex: "Format" = "100x200"), décompose en largeur=100, hauteur=200
6. Si des dimensions sont manquantes pour un produit qui en a besoin (bâche, adhésif...), note-le dans le résumé`

// ── POST /api/chat/angelo ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log('[angelo] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY, 'length:', process.env.ANTHROPIC_API_KEY?.length)
  try {
    const { messages, visitorInfo, use_sonnet, user_id, user_email } = await req.json() as {
      messages: Anthropic.MessageParam[]
      visitorInfo?: { name?: string; email?: string }
      use_sonnet?: boolean
      user_id?: string
      user_email?: string
    }
    const userCtx: UserCtx = { user_id, user_email }

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages requis' }, { status: 400 })
    }

    // Inject visitor/user info into system if available
    const userLine = user_id || user_email
      ? `\n\nContexte client connecté : ${user_email ? `Email: ${user_email}` : ''}${user_id ? ` (user_id: ${user_id})` : ''} — le client est authentifié, utilise get_my_quotes / validate_quote / get_my_orders sans lui demander de se connecter.`
      : ''
    const system = visitorInfo?.name
      ? `${SYSTEM}\n\nInformations visiteur (déjà connues) : Nom: ${visitorInfo.name}${visitorInfo.email ? `, Email: ${visitorInfo.email}` : ''}${userLine}`
      : `${SYSTEM}${userLine}`

    const client = getClient()

    // Agentic loop with streaming output via ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: string) =>
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))

        try {
          let currentMessages = [...messages]

          // Agentic loop (max 5 tool-call rounds)
          for (let round = 0; round < 5; round++) {
            const response = await client.messages.create({
              model: use_sonnet ? 'claude-sonnet-4-6' : 'claude-haiku-4-5',
              max_tokens: use_sonnet ? 4096 : 1024,
              system,
              tools,
              messages: currentMessages,
              stream: true,
            })

            let assistantText = ''
            const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
            let currentToolUse: { id: string; name: string; inputJson: string } | null = null
            let stopReason = ''

            for await (const event of response) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    inputJson: '',
                  }
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  assistantText += event.delta.text
                  send(JSON.stringify({ type: 'text', text: event.delta.text }))
                } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                  currentToolUse.inputJson += event.delta.partial_json
                }
              } else if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                  let parsedInput: Record<string, unknown> = {}
                  try { parsedInput = JSON.parse(currentToolUse.inputJson) } catch {}
                  toolUses.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput,
                  })
                  currentToolUse = null
                }
              } else if (event.type === 'message_delta') {
                stopReason = event.delta.stop_reason || ''
              }
            }

            // No tool calls → we're done
            if (stopReason !== 'tool_use' || !toolUses.length) break

            // Execute tools and continue loop
            const toolResults: Anthropic.MessageParam = {
              role: 'user',
              content: await Promise.all(
                toolUses.map(async (tu) => {
                  send(JSON.stringify({ type: 'tool_call', name: tu.name }))
                  const result = await runTool(tu.name, tu.input, userCtx)

                  // Detect commande rapide action
                  if (result.startsWith('__COMMANDE_RAPIDE__:')) {
                    const parts = result.slice('__COMMANDE_RAPIDE__:'.length).split(':')
                    const encoded = parts[0]
                    const summary = parts.slice(1).join(':')
                    let itemCount = 0
                    try {
                      const items = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
                      itemCount = Array.isArray(items) ? items.length : 0
                      send(JSON.stringify({ type: 'commande_rapide', items, summary }))
                    } catch {}
                    return {
                      type: 'tool_result' as const,
                      tool_use_id: tu.id,
                      content: `Devis accepté. Commande rapide préparée avec ${itemCount} article${itemCount > 1 ? 's' : ''}. ${summary}`,
                    }
                  }

                  return {
                    type: 'tool_result' as const,
                    tool_use_id: tu.id,
                    content: result,
                  }
                }),
              ),
            }

            // Build assistant message with all content blocks
            const assistantContent: Anthropic.Messages.ContentBlock[] = []
            if (assistantText) {
              assistantContent.push({ type: 'text', text: assistantText } as Anthropic.Messages.TextBlock)
            }
            for (const tu of toolUses) {
              assistantContent.push({
                type: 'tool_use',
                id: tu.id,
                name: tu.name,
                input: tu.input,
              } as Anthropic.Messages.ToolUseBlock)
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: assistantContent },
              toolResults,
            ]
          }

          send(JSON.stringify({ type: 'done' }))
        } catch (err) {
          console.error('[angelo/chat]', err)
          send(JSON.stringify({ type: 'error', message: 'Désolé, une erreur est survenue.' }))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[angelo/chat POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
