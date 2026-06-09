import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/crm/quotes/[id]/validate-to-cart
 * Body: { public_token: string }
 *
 * 1. Vérifie que le public_token correspond au devis
 * 2. Vérifie que le devis n'est pas déjà accepté/won
 * 3. Transforme les items du devis en format panier (avec les prix du devis)
 * 4. Retourne { cart_items, quote_number, client_name, client_email }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { public_token } = await req.json()

    if (!public_token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('public_token', public_token)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'Devis introuvable ou token invalide' }, { status: 404 })
    }

    // Vérifier que le devis n'est pas déjà gagné/accepté
    if (quote.pipeline_stage === 'won' || quote.status === 'accepted') {
      return NextResponse.json(
        { error: 'Ce devis a déjà été validé', already_accepted: true },
        { status: 409 },
      )
    }

    const items: unknown[] = Array.isArray(quote.items) ? quote.items : []

    // Récupérer tous les produits référencés en une seule requête
    const productIds = items
      .map((i: unknown) => (i as Record<string, unknown>).product_id)
      .filter((id): id is string => typeof id === 'string' && !!id)

    const productMap: Record<string, Record<string, unknown>> = {}
    if (productIds.length > 0) {
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, category, vat_rate, price_per_m2, price_flat, finitions, delai_options, sides_finitions, standard_sizes, image_url, bleed_mm, min_width_cm, min_height_cm')
        .in('id', productIds)
      if (dbProducts) {
        for (const p of dbProducts) productMap[p.id] = p as Record<string, unknown>
      }
    }

    // Transformer les items du devis en format panier
    const cartItems = items.map((item: unknown) => {
      const line = item as Record<string, unknown>

      // Compatibilité multi-formats :
      // • CRM (QuoteEditor)     → unit_price_ht, description, total_price
      // • Panier (cart-to-quote) → unit_price,    product_name, total
      const unitPrice = (line.unit_price_ht ?? line.unit_price ?? 0) as number
      const qty       = (line.quantity ?? 1) as number
      const totalLine = (line.total_price ?? line.total ?? qty * unitPrice) as number

      // Nom du produit — chercher dans tous les champs possibles
      const productNameFallback = (
        (line.description as string)
        ?? (line.product_name as string)
        ?? (line.name as string)
        ?? ''
      ).trim()

      const pid = line.product_id as string | undefined

      // Priorité : produit complet depuis la DB (avec finitions/delai_options)
      // Fallback : objet minimal avec le nom reconstruit
      let product: Record<string, unknown>
      if (pid && productMap[pid]) {
        // Toujours garder le nom DB mais forcer le fallback si vide
        const dbProduct = productMap[pid]
        product = {
          ...dbProduct,
          name: (dbProduct.name as string) || productNameFallback || 'Article',
        }
      } else {
        product = (line.product as Record<string, unknown>) ?? {
          name: productNameFallback || 'Article',
          id: pid ?? null,
        }
      }

      return {
        product_id:        pid ?? null,
        product,
        quantity:          qty,
        width_cm:          line.width_cm  ?? null,
        height_cm:         line.height_cm ?? null,
        unit_price:        unitPrice,   // PRIX DU DEVIS — ne pas recalculer
        total_price:       totalLine,
        selectedFinitions: (line.selectedFinitions as Record<string, string | string[]>) ?? {},
        selectedDelai:     line.selectedDelai ?? null,
        selectedSides:     (line.selectedSides as Record<string, string[]>) ?? {},
        _from_quote:       true,
        _quote_id:         quote.id,
        _quote_number:     quote.quote_number,
      }
    })

    return NextResponse.json({
      cart_items: cartItems,
      quote_number: quote.quote_number,
      client_name: quote.client_name,
      client_email: quote.client_email,
    })
  } catch (err) {
    console.error('[crm/quotes/validate-to-cart POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
