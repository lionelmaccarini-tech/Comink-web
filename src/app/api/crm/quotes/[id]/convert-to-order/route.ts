import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'
import { addWorkingDaysISO } from '@/lib/workingDays'
import { syncOrderToOdoo, OdooOrderItem } from '@/lib/odoo/syncOrder'
import { isIntraCommunityVAT } from '@/lib/utils'

// ── POST /api/crm/quotes/[id]/convert-to-order ────────────────────────────────
// Convertit un devis CRM en bon de commande + lignes de production
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const body = await req.json()
    const { file_urls = {}, file_analyses = {}, converted_by } = body
    // file_urls:     { [itemIndex]: { url, name, thumb } }
    // file_analyses: { [itemIndex]: { score, status, summary, checks, recommendations } }

    // ── 1. Load the quote ─────────────────────────────────────────────────────
    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (qErr || !quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const items: any[] = Array.isArray(quote.items) ? quote.items : []

    // ── 2. Create order ───────────────────────────────────────────────────────
    const orderNumber = generateOrderNumber()
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        client_name:  quote.client_name,
        client_email: quote.client_email,
        user_id:      quote.user_id || null,
        status:       'confirmed',
        payment_status: 'pending',
        payment_method: 'wire',
        total:        quote.total || 0,
        delivery_method: quote.delivery_method || 'pickup',
        delivery_cost:   quote.delivery_cost   || 0,
        items: [],
        metadata: {
          source:          'crm',
          quote_id:        id,
          quote_number:    quote.quote_number,
          converted_by:    converted_by || null,
          vat_number:      quote.vat_number || null,
          reference:       quote.reference || null,
          notes:           quote.notes || null,
          blind_shipping:  quote.blind_shipping || false,
          billing: {
            name:    quote.client_name,
            email:   quote.client_email,
            company: quote.client_company || null,
            phone:   quote.client_phone  || null,
          },
        },
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // ── 3. Create production lines ────────────────────────────────────────────
    const { data: initialStatus } = await supabase
      .from('production_statuses')
      .select('id')
      .eq('is_initial', true)
      .limit(1)
      .single()

    const lines: any[] = []
    for (let idx = 0; idx < items.length; idx++) {
      const item    = items[idx]
      const fileInfo = file_urls[idx] || {}
      const dueDate  = item.selectedDelai?.days ? addWorkingDaysISO(item.selectedDelai.days) : null
      const finitionsSummary = buildFinitionsSummary(item)

      lines.push({
        order_id:          order.id,
        order_number:      orderNumber,
        user_id:           quote.user_id || null,
        client_name:       quote.client_name,
        client_email:      quote.client_email,
        product_name:      item.product_name || item.product?.name || 'Impression',
        product_id:        item.product_id   || null,
        production_code:   item.production_code || item.product?.production_code || null,
        width_cm:          item.width_cm      || null,
        height_cm:         item.height_cm     || null,
        quantity:          item.quantity      || 1,
        file_url:          fileInfo.url  || item.file_url  || null,
        file_name:         fileInfo.name || item.file_name || null,
        file_thumb:        fileInfo.thumb || item.file_thumb || null,
        status_id:         initialStatus?.id || null,
        due_date:          dueDate,
        delai_label:       item.selectedDelai?.label ?? null,
        finitions_summary: finitionsSummary.length ? finitionsSummary : null,
        sort_order:        idx,
        file_analysis:     file_analyses[idx] || null,
      })
    }

    if (lines.length > 0) {
      const { error: linesErr } = await supabase.from('production_lines').insert(lines)
      if (linesErr) console.error('[convert-to-order] production_lines error:', linesErr)
    }

    // ── 4. Mark quote as won + link order ─────────────────────────────────────
    await supabase
      .from('quotes')
      .update({
        pipeline_stage: 'won',
        status:         'accepted',
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)

    // ── 5. Log CRM activity ───────────────────────────────────────────────────
    await supabase.from('crm_activities').insert({
      quote_id:   id,
      type:       'status_change',
      content:    `Bon de commande créé : ${orderNumber}`,
      new_stage:  'won',
      created_by: converted_by || null,
    })

    // ── 6. Odoo sync (non-blocking) ───────────────────────────────────────────
    try {
      const intraCommunity = quote.vat_number && isIntraCommunityVAT(quote.vat_number)
      const odooItems: OdooOrderItem[] = items.map((item: any) => ({
        product_name:      item.product_name || item.product?.name || 'Impression',
        quantity:          item.quantity || 1,
        unit_price_ht:     item.unit_price ?? 0,
        vat_rate:          intraCommunity ? 0 : 21,
        width_cm:          item.width_cm  ?? null,
        height_cm:         item.height_cm ?? null,
        finitions_summary: buildFinitionsSummary(item) || null,
        delai_days:        item.selectedDelai?.days ?? null,
      }))

      const deliveryLabel =
        quote.delivery_method === 'express' ? 'Livraison express' :
        quote.delivery_method === 'parcel'  ? 'Livraison colis 48h' : null

      syncOrderToOdoo({
        orderId:         order.id,
        orderNumber,
        clientName:      quote.client_name,
        clientEmail:     quote.client_email,
        vatNumber:       quote.vat_number || null,
        clientReference: quote.reference  || null,
        items:           odooItems,
        deliveryCost:    deliveryLabel ? (quote.delivery_cost ?? null) : null,
        deliveryVatRate: intraCommunity ? 0 : 21,
        deliveryLabel:   deliveryLabel ?? undefined,
        supabase,
      }).catch(() => {})
    } catch (e) {
      console.error('[convert-to-order] Odoo sync error:', e)
    }

    return NextResponse.json({ order_number: orderNumber, order_id: order.id, success: true })
  } catch (err) {
    console.error('[convert-to-order POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildFinitionsSummary(item: any): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = []
  const product = item.product

  if (item.finitions_summary) return item.finitions_summary

  if (!product) return result

  const groups: any[] = product.finitions ?? []
  const selFin: Record<string, string | string[]> = item.selectedFinitions ?? {}
  for (const group of groups) {
    const sel = selFin[group.id]
    if (!sel || (Array.isArray(sel) && sel.length === 0)) continue
    const ids    = Array.isArray(sel) ? sel : [sel]
    const labels = (group.options ?? []).filter((o: any) => ids.includes(o.id)).map((o: any) => o.label)
    if (labels.length) result.push({ label: group.label, value: labels.join(', ') })
  }

  const sf = product.sides_finitions
  if (sf?.enabled && sf.sides?.length) {
    const selSides: Record<string, string[]> = item.selectedSides ?? {}
    for (const side of sf.sides) {
      const optIds: string[] = selSides[side.id] ?? []
      if (!optIds.length) continue
      const labels = (sf.options ?? []).filter((o: any) => optIds.includes(o.id)).map((o: any) => o.label)
      if (labels.length) result.push({ label: side.label, value: labels.join(', ') })
    }
  }

  return result
}
