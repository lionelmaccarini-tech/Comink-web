import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'
import { addWorkingDaysISO } from '@/lib/workingDays'
import { syncOrderToOdoo, OdooOrderItem } from '@/lib/odoo/syncOrder'
import { isIntraCommunityVAT } from '@/lib/utils'
import { getPartnerFollowupInfo, isOdooConfigured } from '@/lib/odoo/client'
import { sendOrderConfirmationEmail } from '@/lib/email/resend'

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeFinitionGroups(raw: any[]): any[] {
  if (!raw?.length) return []
  if (raw[0]?.options !== undefined) return raw
  return raw.map((f: any) => ({
    id: f.id ?? '',
    label: f.name ?? '',
    display_type: f.display_type ?? 'checkbox',
    required: false,
    options: [{ id: (f.id ?? '') + '_opt', label: f.name ?? '', price_type: f.price_type ?? 'fixed', price_supplement: f.price_supplement ?? 0, default_selected: f.default_selected ?? false }],
  }))
}

function buildFinitionsSummary(item: any): Array<{ label: string; value: string }> {
  const product = item.product
  const result: Array<{ label: string; value: string }> = []
  if (!product) return result

  // Finitions groupées
  const groups = normalizeFinitionGroups(product.finitions ?? [])
  const selFin: Record<string, string | string[]> = item.selectedFinitions ?? {}
  for (const group of groups) {
    const sel = selFin[group.id]
    if (!sel || (Array.isArray(sel) && sel.length === 0)) continue
    const ids = Array.isArray(sel) ? sel : [sel]
    const labels = group.options.filter((o: any) => ids.includes(o.id)).map((o: any) => o.label)
    if (labels.length) result.push({ label: group.label, value: labels.join(', ') })
  }

  // Finitions par côté
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
    const {
      items,
      vatNumber,
      orderReference,
      billing,
      shipping,
      delivery_method,
      delivery_cost,
      ship_in_client_name,
      total_ttc,
      total_ht,
    } = await req.json()

    // Get authenticated user from session (server-side cookie)
    const supabaseAuth = await createClient()
    const { data: { user: authUser } } = await supabaseAuth.auth.getUser()

    // ── Blocage commande si niveau relance >= 2 ───────────────────────────────
    if (isOdooConfigured() && authUser?.email) {
      const followup = await getPartnerFollowupInfo(authUser.email)
      if (followup.level >= 2) {
        return NextResponse.json(
          { error: "Votre compte est bloqué en raison de factures impayées. Veuillez régulariser votre situation pour passer commande." },
          { status: 403 },
        )
      }
    }

    const supabase = await createServiceClient()
    const orderNumber = generateOrderNumber()

    // Resolve user_id and email — prefer authenticated session over billing object
    const userId: string | null = authUser?.id ?? null
    const clientEmail: string = authUser?.email || billing?.email || ''

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        client_name: billing?.name || '',
        client_email: clientEmail,
        status: 'pending_wire',
        payment_status: 'pending',
        payment_method: 'wire',
        total: total_ttc,
        delivery_method,
        delivery_cost,
        items: [],
        metadata: {
          billing,
          shipping,
          vat_number: vatNumber || null,
          items_summary: orderReference || null,
          ship_in_client_name: ship_in_client_name || false,
        },
        ...(userId ? { user_id: userId } : {}),
      })
      .select()
      .single()

    if (orderError) throw orderError

    // ── Odoo sync (non-blocking) ──────────────────────────────────────────────
    try {
      const intraCommunity = vatNumber && isIntraCommunityVAT(vatNumber)

      // Lookup odoo_account_code par product_id
      const productIds = [...new Set((items as any[]).map((i: any) => i.product?.id).filter(Boolean))] as string[]
      let accountCodeByProduct: Record<string, string> = {}
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, odoo_account_code')
          .in('id', productIds)
        if (prods) {
          for (const p of prods) {
            if (p.odoo_account_code) accountCodeByProduct[p.id] = p.odoo_account_code
          }
        }
      }

      const odooItems: OdooOrderItem[] = []

      for (const item of items as any[]) {
        const vatRate         = intraCommunity ? 0 : (item.product?.vat_rate ?? 21)
        const finitions       = buildFinitionsSummary(item)
        const delaiDays       = item.selectedDelai?.days ?? null
        const accountCode     = item.product?.id ? (accountCodeByProduct[item.product.id] ?? null) : null

        // Multi-file mode: one Odoo line per file copy
        if (Array.isArray(item.files) && item.files.length > 0) {
          for (const f of item.files) {
            odooItems.push({
              product_name:      item.product?.name || 'Impression',
              quantity:          f.copies ?? 1,
              unit_price_ht:     item.unit_price    ?? 0,
              vat_rate:          vatRate,
              width_cm:          item.width_cm      ?? null,
              height_cm:         item.height_cm     ?? null,
              finitions_summary: finitions.length ? finitions : null,
              delai_days:        delaiDays,
              odoo_account_code: accountCode,
            })
          }
        } else {
          odooItems.push({
            product_name:      item.product?.name || 'Impression',
            quantity:          item.quantity,
            unit_price_ht:     item.unit_price    ?? 0,
            vat_rate:          vatRate,
            width_cm:          item.width_cm      ?? null,
            height_cm:         item.height_cm     ?? null,
            finitions_summary: finitions.length ? finitions : null,
            delai_days:        delaiDays,
            odoo_account_code: accountCode,
          })
        }
      }

      const deliveryVatRate = intraCommunity ? 0 : 21
      const deliveryLabel   = delivery_method === 'express'
        ? 'Livraison express'
        : delivery_method === 'parcel'
          ? 'Livraison colis 48h'
          : delivery_method === 'pickup'
            ? null  // no delivery line for pickup
            : 'Livraison'

      syncOrderToOdoo({
        orderId:          order?.id,
        orderNumber,
        clientName:       billing?.name || '',
        clientEmail,
        vatNumber:        vatNumber || null,
        clientReference:  orderReference || null,
        items:            odooItems,
        deliveryCost:     deliveryLabel ? (delivery_cost ?? null) : null,
        deliveryVatRate,
        deliveryLabel:    deliveryLabel ?? undefined,
        supabase,
      }).catch(() => {/* already logged inside */})
    } catch (odooErr) {
      console.error('[wire order] Odoo sync build error:', odooErr)
    }

    // Create production lines from items
    try {
      const { data: initialStatus } = await supabase
        .from('production_statuses')
        .select('id')
        .eq('is_initial', true)
        .limit(1)
        .single()

      const lines: any[] = []
      let sortOrder = 0
      for (const item of items as any[]) {
        const dueDate    = item.selectedDelai?.days ? addWorkingDaysISO(item.selectedDelai.days) : null
        const delaiLabel = item.selectedDelai?.label ?? null
        const finitions  = buildFinitionsSummary(item)

        // Mode multi-fichiers : une ligne par fichier
        if (Array.isArray(item.files) && item.files.length > 0) {
          for (const f of item.files) {
            lines.push({
              order_id:          order?.id || null,
              order_number:      orderNumber,
              user_id:           userId,
              client_name:       billing?.name || '',
              client_email:      clientEmail,
              product_name:      item.product?.name || 'Impression',
              product_id:        item.product_id   || null,
              production_code:   item.product?.production_code || null,
              width_cm:          item.width_cm     || null,
              height_cm:         item.height_cm    || null,
              quantity:          f.copies ?? 1,
              file_url:          f.file_url   || item.file_url   || null,
              file_name:         f.file_name  || item.file_name  || null,
              file_thumb:        f.file_thumb || item.file_thumb || null,
              file_analysis:     f.file_analysis  || item.file_analysis  || null,
              status_id:         initialStatus?.id || null,
              due_date:          dueDate,
              delai_label:       delaiLabel,
              finitions_summary: finitions.length ? finitions : null,
              line_reference:    item.reference    || null,
              order_reference:   orderReference    || null,
              sort_order:        sortOrder++,
              is_subcontracted:  item.product?.is_subcontracted ?? false,
            })
          }
        } else {
          // Mode fichier unique
          lines.push({
            order_id:          order?.id || null,
            order_number:      orderNumber,
            user_id:           userId,
            client_name:       billing?.name || '',
            client_email:      clientEmail,
            product_name:      item.product?.name || 'Impression',
            product_id:        item.product_id   || null,
            production_code:   item.product?.production_code || null,
            width_cm:          item.width_cm     || null,
            height_cm:         item.height_cm    || null,
            quantity:          item.quantity,
            file_url:          item.file_url     || null,
            file_name:         item.file_name    || null,
            file_thumb:        item.file_thumb   || null,
            file_analysis:     item.file_analysis || null,
            status_id:         initialStatus?.id || null,
            due_date:          dueDate,
            delai_label:       delaiLabel,
            finitions_summary: finitions.length ? finitions : null,
            line_reference:    item.reference    || null,
            order_reference:   orderReference    || null,
            sort_order:        sortOrder++,
            is_subcontracted:  item.product?.is_subcontracted ?? false,
          })
        }
      }

      if (lines.length > 0) {
        const { error: linesError } = await supabase.from('production_lines').insert(lines)
        if (linesError) {
          console.error('[wire order] production_lines insert error:', JSON.stringify(linesError))
        } else {
          console.log(`[wire order] ${lines.length} production line(s) created for ${orderNumber}`)
        }
      }
    } catch (prodErr) {
      console.error('[wire order] production lines error:', prodErr)
    }

    // ── Email confirmation (non-bloquant) ────────────────────────────────────
    try {
      const clientName = billing?.name || authUser?.email || ''
      if (clientEmail && clientName) {
        await sendOrderConfirmationEmail({
          order_number: orderNumber,
          client_name: clientName,
          client_email: clientEmail,
          items: (items as any[]).map((item: any) => ({
            name: item.product?.name || 'Impression',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
          })),
          total: total_ttc || 0,
          delivery_method: delivery_method || 'pickup',
        })
      }
    } catch (emailErr) {
      console.error('[wire order] email error:', emailErr)
    }

    return NextResponse.json({ order_number: orderNumber, success: true })
  } catch (err) {
    console.error('[orders/wire POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
