import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOrderConfirmation } from '@/lib/resend/client'
import { generateOrderNumber } from '@/lib/utils'
import { addWorkingDaysISO } from '@/lib/workingDays'
import { syncOrderToOdoo, OdooOrderItem } from '@/lib/odoo/syncOrder'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const supabase = await createServiceClient()
    const orderNumber = generateOrderNumber()

    // Try to find user_id by email before creating the order
    let userId: string | null = null
    const clientEmail = session.customer_details?.email
    if (clientEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', clientEmail)
        .limit(1)
        .single()
      if (profile) userId = profile.id
    }

    const { data: order } = await supabase.from('orders').insert({
      order_number: orderNumber,
      client_name: session.customer_details?.name || '',
      client_email: clientEmail || '',
      user_id: userId,
      status: 'confirmed',
      payment_status: 'paid',
      stripe_payment_intent_id: session.payment_intent,
      total: session.amount_total / 100,
      subtotal: session.amount_subtotal / 100,
      tax: (session.amount_total - session.amount_subtotal) / 100,
      items: [],
      delivery_type: session.shipping_address ? 'shipping' : 'pickup',
      shipping_address: session.shipping_details?.address,
      metadata: {
        billing_name:        session.metadata?.billing_name    || '',
        billing_company:     session.metadata?.billing_company || '',
        vat_number:          session.metadata?.vat_number      || null,
        ship_in_client_name: session.metadata?.ship_in_client_name === 'true',
        order_reference:     session.metadata?.order_reference || null,
      },
    }).select().single()

    if (order) {
      await sendOrderConfirmation(
        clientEmail,
        orderNumber,
        session.amount_total / 100
      )

      // ── Reassemble items_full (chunked in Stripe metadata) ─────────────────
      let itemsFullRaw = session.metadata?.items_full || ''
      let chunk = 1
      while (session.metadata?.[`items_full_${chunk}`]) {
        itemsFullRaw += session.metadata[`items_full_${chunk}`]
        chunk++
      }

      // ── Odoo sync (non-blocking) ────────────────────────────────────────────
      if (itemsFullRaw) {
        try {
          const itemsFull = JSON.parse(itemsFullRaw) as Array<{
            product_name: string
            product_id: string | null
            production_code: string | null
            width_cm: number | null
            height_cm: number | null
            quantity: number
            file_url: string | null
            file_name: string | null
            file_thumb: string | null
            delai_days: number | null
            delai_label: string | null
            finitions_summary: Array<{ label: string; value: string }> | null
            unit_price_ht: number
            vat_rate: number
          }>

          const odooItems: OdooOrderItem[] = itemsFull.map(item => ({
            product_name:      item.product_name,
            quantity:          item.quantity,
            unit_price_ht:     item.unit_price_ht ?? 0,
            vat_rate:          item.vat_rate       ?? 21,
            width_cm:          item.width_cm       ?? null,
            height_cm:         item.height_cm      ?? null,
            finitions_summary: item.finitions_summary?.length ? item.finitions_summary : null,
            delai_days:        item.delai_days      ?? null,
          }))

          syncOrderToOdoo({
            orderId:          order.id,
            orderNumber,
            clientName:       session.customer_details?.name  || '',
            clientEmail:      clientEmail || '',
            vatNumber:        session.metadata?.vat_number    || null,
            clientReference:  session.metadata?.order_reference || null,
            items:            odooItems,
            deliveryCost:     parseFloat(session.metadata?.delivery_cost_ht || '0') || null,
            deliveryVatRate:  parseInt(session.metadata?.delivery_vat_rate  || '21', 10),
            deliveryLabel:    session.metadata?.delivery_method === 'express'
                                ? 'Livraison express'
                                : session.metadata?.delivery_method === 'parcel'
                                  ? 'Livraison colis 48h'
                                  : 'Livraison',
            supabase,
          }).catch(() => {/* already logged inside */})
        } catch (odooErr) {
          console.error('[webhook] Odoo sync error:', odooErr)
        }
      }

      // ── Create production lines ─────────────────────────────────────────────
      try {
        if (itemsFullRaw) {
          const itemsFull = JSON.parse(itemsFullRaw) as Array<{
            product_name: string
            product_id: string | null
            production_code: string | null
            width_cm: number | null
            height_cm: number | null
            quantity: number
            file_url: string | null
            file_name: string | null
            file_thumb: string | null
            delai_days: number | null
            delai_label: string | null
            finitions_summary: Array<{ label: string; value: string }> | null
          }>

          const { data: initialStatus } = await supabase
            .from('production_statuses')
            .select('id')
            .eq('is_initial', true)
            .limit(1)
            .single()

          const lines = itemsFull.map((item, idx) => ({
            order_id:          order.id,
            order_number:      orderNumber,
            user_id:           userId,
            client_name:       session.customer_details?.name  || '',
            client_email:      session.customer_details?.email || '',
            product_name:      item.product_name,
            product_id:        item.product_id    || null,
            production_code:   item.production_code || null,
            width_cm:          item.width_cm      || null,
            height_cm:         item.height_cm     || null,
            quantity:          item.quantity,
            file_url:          item.file_url      || null,
            file_name:         item.file_name     || null,
            file_thumb:        item.file_thumb    || null,
            status_id:         initialStatus?.id  || null,
            due_date:          item.delai_days ? addWorkingDaysISO(item.delai_days) : null,
            delai_label:       item.delai_label   || null,
            finitions_summary: item.finitions_summary?.length ? item.finitions_summary : null,
            sort_order:        idx,
          }))

          if (lines.length > 0) {
            await supabase.from('production_lines').insert(lines)
          }
        }
      } catch (prodErr) {
        console.error('[webhook] production lines creation error:', prodErr)
      }
    }
  }

  return NextResponse.json({ received: true })
}
