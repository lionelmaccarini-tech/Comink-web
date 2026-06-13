import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncOrderToOdoo, OdooOrderItem } from '@/lib/odoo/syncOrder'

/**
 * POST /api/admin/odoo-resync
 * Recrée les factures Odoo pour toutes les commandes confirmées.
 *
 * Sécurité : header Authorization: Bearer <ADMIN_RESYNC_SECRET>
 * Body (optionnel): { skip_existing: true } → ignore les orders qui ont déjà un odoo_invoice_id
 */
export async function POST(req: NextRequest) {
  // ── Sécurité basique ─────────────────────────────────────────────────────────
  const secret = process.env.ADMIN_RESYNC_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_RESYNC_SECRET non configuré' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const skipExisting = body.skip_existing !== false // true par défaut

  const supabase = await createServiceClient()

  // ── Récupérer toutes les commandes confirmées ─────────────────────────────────
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      client_name,
      client_email,
      subtotal,
      tax,
      total,
      delivery_cost,
      delivery_method,
      metadata
    `)
    .in('status', ['confirmed', 'in_production', 'ready', 'shipped', 'delivered'])
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Récupérer toutes les lignes de production groupées par order_id ───────────
  const orderIds = (orders ?? []).map(o => o.id)
  const { data: lines } = await supabase
    .from('production_lines')
    .select('order_id, product_name, quantity, width_cm, height_cm, finitions_summary, due_date')
    .in('order_id', orderIds)
    .order('sort_order', { ascending: true })

  const linesByOrder: Record<string, typeof lines> = {}
  for (const line of lines ?? []) {
    if (!linesByOrder[line.order_id]) linesByOrder[line.order_id] = []
    linesByOrder[line.order_id]!.push(line)
  }

  // ── Resync ───────────────────────────────────────────────────────────────────
  const results: Array<{ order_number: string; status: 'synced' | 'skipped' | 'error'; detail?: string }> = []

  for (const order of orders ?? []) {
    // Skip si déjà synced
    if (skipExisting && order.metadata?.odoo_invoice_id) {
      results.push({ order_number: order.order_number, status: 'skipped', detail: `invoice_id=${order.metadata.odoo_invoice_id}` })
      continue
    }

    try {
      const orderLines = linesByOrder[order.id] ?? []

      // Calculer le taux de TVA approximatif depuis subtotal/tax
      const subtotalHt = Number(order.subtotal) || 0
      const taxAmount  = Number(order.tax) || 0
      const deliveryCostRaw = Number(order.delivery_cost) || 0

      // TVA en % (arrondi au taux standard le plus proche : 0, 6, 21)
      let vatRate = 21
      if (subtotalHt > 0) {
        const rawRate = (taxAmount / subtotalHt) * 100
        if (rawRate < 3)       vatRate = 0
        else if (rawRate < 14) vatRate = 6
        else                   vatRate = 21
      }

      // Métadonnées client
      const vatNumber      = order.metadata?.vat_number || null
      const clientRef      = order.metadata?.order_reference || order.metadata?.items_summary || null
      const clientName     = order.client_name || order.metadata?.billing?.name || ''

      let odooItems: OdooOrderItem[] = []

      if (orderLines.length > 0) {
        // Une ligne Odoo par ligne de production (prix répartis proportionnellement)
        // Montant HT produits (hors livraison)
        const productSubtotal = subtotalHt - deliveryCostHt(deliveryCostRaw, vatRate)

        // Poids = quantité de chaque ligne
        const totalQty = orderLines.reduce((s, l) => s + (l.quantity ?? 1), 0)

        for (const line of orderLines) {
          const qty = line.quantity ?? 1
          // Prix unitaire HT proportionnel à la quantité
          const unitPriceHt = totalQty > 0
            ? Math.round((productSubtotal * (qty / totalQty) / qty) * 100) / 100
            : 0

          odooItems.push({
            product_name:      line.product_name,
            quantity:          qty,
            unit_price_ht:     unitPriceHt,
            vat_rate:          vatRate,
            width_cm:          line.width_cm  ? Number(line.width_cm)  : null,
            height_cm:         line.height_cm ? Number(line.height_cm) : null,
            finitions_summary: Array.isArray(line.finitions_summary) && line.finitions_summary.length
              ? line.finitions_summary
              : null,
            delai_days: null,
          })
        }
      } else {
        // Pas de lignes → une seule ligne globale
        odooItems.push({
          product_name:  `Commande ${order.order_number}`,
          quantity:      1,
          unit_price_ht: subtotalHt - deliveryCostHt(deliveryCostRaw, vatRate),
          vat_rate:      vatRate,
        })
      }

      const deliveryLabel =
        order.delivery_method === 'express' ? 'Livraison express' :
        order.delivery_method === 'parcel'  ? 'Livraison colis 48h' :
        order.delivery_method === 'pickup'  ? null : null

      await syncOrderToOdoo({
        orderId:         order.id,
        orderNumber:     order.order_number,
        clientName,
        clientEmail:     order.client_email,
        vatNumber,
        clientReference: clientRef,
        items:           odooItems,
        deliveryCost:    deliveryLabel ? deliveryCostRaw || null : null,
        deliveryVatRate: vatRate,
        deliveryLabel:   deliveryLabel ?? undefined,
        supabase,
      })

      results.push({ order_number: order.order_number, status: 'synced' })
    } catch (err: any) {
      results.push({ order_number: order.order_number, status: 'error', detail: err?.message })
    }
  }

  const summary = {
    total:   results.length,
    synced:  results.filter(r => r.status === 'synced').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors:  results.filter(r => r.status === 'error').length,
  }

  return NextResponse.json({ summary, results })
}

/** Convertit un montant de livraison TTC en HT selon le taux de TVA */
function deliveryCostHt(ttc: number, vatRatePercent: number): number {
  if (!ttc || vatRatePercent === 0) return ttc
  return Math.round((ttc / (1 + vatRatePercent / 100)) * 100) / 100
}
