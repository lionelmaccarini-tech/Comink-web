import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { isIntraCommunityVAT } from '@/lib/utils'

// ── Finitions summary builder (same logic as wire route) ─────────────────────
function normalizeFinitionGroups(raw: any[]): any[] {
  if (!raw?.length) return []
  if (raw[0]?.options !== undefined) return raw
  return raw.map((f: any) => ({
    id: f.id ?? '',
    label: f.name ?? '',
    options: [{ id: (f.id ?? '') + '_opt', label: f.name ?? '' }],
  }))
}

function buildFinitionsSummary(item: any): Array<{ label: string; value: string }> {
  const product = item.product
  const result: Array<{ label: string; value: string }> = []
  if (!product) return result

  const groups = normalizeFinitionGroups(product.finitions ?? [])
  const selFin: Record<string, string | string[]> = item.selectedFinitions ?? {}
  for (const group of groups) {
    const sel = selFin[group.id]
    if (!sel || (Array.isArray(sel) && sel.length === 0)) continue
    const ids = Array.isArray(sel) ? sel : [sel]
    const labels = group.options.filter((o: any) => ids.includes(o.id)).map((o: any) => o.label)
    if (labels.length) result.push({ label: group.label, value: labels.join(', ') })
  }

  const sf = product.sides_finitions
  if (sf?.enabled && sf.sides?.length) {
    const selSides: Record<string, string[]> = item.selectedSides ?? {}
    for (const side of sf.sides) {
      const optIds: string[] = selSides[side.id] ?? []
      if (!optIds.length) continue
      const labels = sf.options.filter((o: any) => optIds.includes(o.id)).map((o: any) => o.label)
      if (labels.length) result.push({ label: side.label, value: labels.join(', ') })
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const { items, vatNumber, orderReference, billing, shipping, delivery_method, delivery_cost, ship_in_client_name } = await req.json()
    const siteUrl        = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const intraCommunity = vatNumber && isIntraCommunityVAT(vatNumber)

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => {
      const vatRate  = intraCommunity ? 0 : (item.product?.vat_rate ?? 21)
      const ttcPrice = item.unit_price * (1 + vatRate / 100)
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name:        item.product?.name || 'Impression',
            description: item.width_cm ? `${item.width_cm}×${item.height_cm} cm` : undefined,
            images:      item.product?.image_url ? [item.product.image_url] : [],
          },
          unit_amount: Math.round(ttcPrice * 100),
        },
        quantity: item.quantity,
      }
    })

    // Add delivery as a line item if applicable
    if (delivery_cost && delivery_cost > 0) {
      const deliveryName = delivery_method === 'parcel' ? 'Livraison colis 48h' : 'Livraison express'
      // delivery_cost est HTVA — appliquer TVA 21% (0% si intracommunautaire)
      const delivVatRate = intraCommunity ? 0 : 21
      const deliveryTTC = delivery_cost * (1 + delivVatRate / 100)
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: deliveryName },
          unit_amount: Math.round(deliveryTTC * 100),
        },
        quantity: 1,
      })
    }

    // Une entrée par visuel (fichier) — même logique que la route wire
    const itemsFull: any[] = []
    for (const i of items as any[]) {
      const vatRate = intraCommunity ? 0 : (i.product?.vat_rate ?? 21)
      const base = {
        product_name:      i.product?.name || 'Impression',
        product_id:        i.product_id   || null,
        production_code:   i.product?.production_code || null,
        width_cm:          i.width_cm     || null,
        height_cm:         i.height_cm    || null,
        file_thumb:        null,
        delai_days:        i.selectedDelai?.days  ?? null,
        delai_label:       i.selectedDelai?.label ?? null,
        finitions_summary: buildFinitionsSummary(i),
        // Odoo sync — pricing
        unit_price_ht:     i.unit_price   ?? 0,
        vat_rate:          vatRate,
      }
      if (Array.isArray(i.files) && i.files.length > 0) {
        for (const f of i.files) {
          itemsFull.push({
            ...base,
            quantity:  f.copies ?? 1,
            file_url:  f.file_url  || i.file_url  || null,
            file_name: f.file_name || i.file_name || null,
          })
        }
      } else {
        itemsFull.push({
          ...base,
          quantity:  i.quantity,
          file_url:  i.file_url  || null,
          file_name: i.file_name || null,
        })
      }
    }

    // Stripe metadata: max 500 chars per value. Chunk items_full if needed.
    const itemsFullJson = JSON.stringify(itemsFull)
    const CHUNK = 490
    const itemsFullChunks: Record<string, string> = {}
    if (itemsFullJson.length <= CHUNK) {
      itemsFullChunks['items_full'] = itemsFullJson
    } else {
      let i = 0, chunk = 0
      while (i < itemsFullJson.length) {
        itemsFullChunks[chunk === 0 ? 'items_full' : `items_full_${chunk}`] = itemsFullJson.slice(i, i + CHUNK)
        i += CHUNK; chunk++
      }
    }

    const metadata: Record<string, string> = {
      items:              JSON.stringify(items.map((i: any) => ({ id: i.product_id, qty: i.quantity }))),
      ...itemsFullChunks,
      order_reference:    orderReference || '',
      delivery_cost_ht:   String(delivery_cost  || 0),
      delivery_method:    delivery_method || '',
      delivery_vat_rate:  String(intraCommunity ? 0 : 21),
      billing_name:    billing?.name    || '',
      billing_company: billing?.company || '',
      billing_line1:   billing?.line1   || '',
      billing_city:    billing?.city    || '',
      billing_postal:  billing?.postal_code || '',
      billing_country: billing?.country || 'BE',
      shipping_line1:  shipping?.line1  || billing?.line1  || '',
      shipping_city:   shipping?.city   || billing?.city   || '',
      shipping_postal: shipping?.postal_code || billing?.postal_code || '',
      shipping_country:shipping?.country || billing?.country || 'BE',
      ...(intraCommunity ? { vat_exemption: 'intra_community', vat_number: vatNumber } : {}),
      ...(ship_in_client_name ? { ship_in_client_name: 'true' } : {}),
    }

    let customerId: string | undefined

    // Créer un Customer Stripe avec l'adresse pour pré-remplir le checkout
    if (billing?.line1 && billing?.city) {
      try {
        const customer = await stripe.customers.create({
          name:    billing.name || undefined,
          address: {
            line1:       billing.line1,
            line2:       billing.line2 || undefined,
            city:        billing.city,
            postal_code: billing.postal_code || undefined,
            country:     billing.country || 'BE',
          },
          shipping: {
            name:    billing.name || '',
            address: {
              line1:       shipping?.line1 || billing.line1,
              line2:       (shipping?.line2 || billing.line2) || undefined,
              city:        shipping?.city  || billing.city,
              postal_code: (shipping?.postal_code || billing.postal_code) || undefined,
              country:     shipping?.country || billing.country || 'BE',
            },
          },
        })
        customerId = customer.id
      } catch { /* ignore — fallback sans customer */ }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact'],
      line_items:           lineItems,
      mode:                 'payment',
      success_url:          `${siteUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${siteUrl}/panier`,
      locale:               'fr',
      ...(customerId ? { customer: customerId } : {}),
      billing_address_collection:  customerId ? 'auto' : 'required',
      shipping_address_collection: { allowed_countries: ['BE', 'FR', 'NL', 'LU', 'DE'] },
      metadata,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
