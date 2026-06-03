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

    // Transformer les items du devis en format panier
    const cartItems = items.map((item: unknown) => {
      const line = item as Record<string, unknown>
      const unitPrice = (line.unit_price_ht ?? line.unit_price ?? 0) as number
      const qty = (line.quantity ?? 1) as number
      const totalLine = (line.total_price ?? qty * unitPrice) as number

      return {
        product_id: line.product_id ?? null,
        product: line.product ?? {
          name: line.description ?? '',
          id: line.product_id ?? null,
        },
        quantity: qty,
        width_cm: line.width_cm ?? null,
        height_cm: line.height_cm ?? null,
        unit_price: unitPrice,          // PRIX DU DEVIS — ne pas recalculer
        total_price: totalLine,
        selectedFinitions: line.selectedFinitions ?? {},
        selectedDelai: line.selectedDelai ?? null,
        selectedSides: line.selectedSides ?? {},
        _from_quote: true,
        _quote_id: quote.id,
        _quote_number: quote.quote_number,
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
