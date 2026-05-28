import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'
import { addWorkingDaysISO } from '@/lib/workingDays'
import { syncOrderToOdoo, OdooOrderItem } from '@/lib/odoo/syncOrder'
import { isIntraCommunityVAT } from '@/lib/utils'

// ── POST /api/production/orders ───────────────────────────────────────────────
// Création manuelle d'une commande par le staff (admin + collaborateur UNIQUEMENT)
// Les producteurs n'ont pas accès à cette route.

const CRM_ROLES = ['admin', 'collaborateur']

function buildFinitionsSummary(item: any): Array<{ label: string; value: string }> {
  if (item.finitions_summary) return item.finitions_summary
  const product = item.product
  if (!product) return []
  const result: Array<{ label: string; value: string }> = []

  const groups: any[] = product.finitions ?? []
  const normalised = groups[0]?.options !== undefined ? groups : groups.map((f: any) => ({
    id: f.id ?? '', label: f.name ?? '', display_type: f.display_type ?? 'checkbox',
    options: [{ id: (f.id ?? '') + '_opt', label: f.name ?? '' }],
  }))

  const selFin: Record<string, string | string[]> = item.selectedFinitions ?? {}
  for (const group of normalised) {
    const sel = selFin[group.id]
    if (!sel || (Array.isArray(sel) && sel.length === 0)) continue
    const ids = Array.isArray(sel) ? sel : [sel]
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

export async function POST(req: NextRequest) {
  try {
    // ── Auth : admin ou collaborateur uniquement ───────────────────────────────
    const { user, profile } = await requireStaff()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (!CRM_ROLES.includes((profile as any).role)) {
      return NextResponse.json(
        { error: 'Accès refusé — seuls les administrateurs et collaborateurs peuvent créer des commandes manuelles.' },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const {
      items = [],
      billing,
      delivery_method = 'pickup',
      delivery_cost = 0,
      orderReference,
      source,
      notes,
    } = await req.json()

    if (!billing?.name || !billing?.email) {
      return NextResponse.json({ error: 'Nom et email client requis' }, { status: 400 })
    }
    if (!items.length) {
      return NextResponse.json({ error: 'Au moins une ligne requise' }, { status: 400 })
    }

    const orderNumber = generateOrderNumber()

    // ── Créer l'order ─────────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number:   orderNumber,
        client_name:    billing.name,
        client_email:   billing.email,
        status:         'confirmed',
        payment_status: 'pending',
        payment_method: 'wire',
        total:          0,
        delivery_method,
        delivery_cost,
        items: [],
        metadata: {
          billing,
          source:       source ?? 'staff',
          created_by:   user.id,
          reference:    orderReference ?? null,
          notes:        notes ?? null,
          manual_order: true,
        },
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // ── Créer les lignes de production ────────────────────────────────────────
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

      lines.push({
        order_id:          order.id,
        order_number:      orderNumber,
        user_id:           null,
        client_name:       billing.name,
        client_email:      billing.email,
        product_name:      item.product?.name || item.product_name || 'Impression',
        product_id:        item.product_id   ?? null,
        production_code:   item.product?.production_code ?? null,
        width_cm:          item.width_cm      ?? null,
        height_cm:         item.height_cm     ?? null,
        quantity:          item.quantity      ?? 1,
        file_url:          item.file_url      ?? null,
        file_name:         item.file_name     ?? null,
        file_thumb:        item.file_thumb    ?? null,
        file_analysis:     item.file_analysis ?? null,
        status_id:         initialStatus?.id  ?? null,
        due_date:          dueDate,
        delai_label:       delaiLabel,
        finitions_summary: finitions.length ? finitions : null,
        notes:             notes ?? null,
        sort_order:        sortOrder++,
      })
    }

    if (lines.length > 0) {
      const { error: linesErr } = await supabase.from('production_lines').insert(lines)
      if (linesErr) console.error('[production/orders] lines error:', linesErr)
    }

    // ── Odoo sync (non-bloquant) ──────────────────────────────────────────────
    try {
      const odooItems: OdooOrderItem[] = items.map((item: any) => ({
        product_name:      item.product?.name || 'Impression',
        quantity:          item.quantity ?? 1,
        unit_price_ht:     0,
        vat_rate:          item.product?.vat_rate ?? 21,
        width_cm:          item.width_cm  ?? null,
        height_cm:         item.height_cm ?? null,
        finitions_summary: buildFinitionsSummary(item) || null,
        delai_days:        item.selectedDelai?.days ?? null,
      }))
      syncOrderToOdoo({
        orderId:        order.id,
        orderNumber,
        clientName:     billing.name,
        clientEmail:    billing.email,
        vatNumber:      null,
        clientReference: orderReference ?? null,
        items:          odooItems,
        deliveryCost:   null,
        deliveryVatRate: 21,
        supabase,
      }).catch(() => {})
    } catch (odooErr) {
      console.error('[production/orders] Odoo sync error:', odooErr)
    }

    return NextResponse.json({ order_number: orderNumber, order_id: order.id, success: true })
  } catch (err: any) {
    console.error('[production/orders POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
