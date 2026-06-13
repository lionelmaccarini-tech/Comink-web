/**
 * Odoo order sync helper — Level 1
 *
 * Builds a multi-line OdooInvoiceInput from order data and calls createOdooInvoice.
 * Always fire-and-forget: errors are logged, never thrown to the caller.
 *
 * Invoice structure:
 *   ┌─ [section]  "Commande CMKXXXXXX"
 *   ├─ [line]     Banderole PVC 440g          qty=2   150.00 HT   21%
 *   ├─ [note]     → 200×80 cm | Ourlet, Œillet
 *   ├─ [line]     Roll-up 85×200              qty=1    80.00 HT   21%
 *   └─ [line]     Livraison colis                       8.50 HT   21%
 *
 *   ref               = client's optional reference (their PO number)
 *   payment_reference = Comink order number
 *   invoice_date_due  = latest delivery date across all items
 */

import { createOdooInvoice, isOdooConfigured, OdooInvoiceLine } from './client'
import { addWorkingDaysISO } from '@/lib/workingDays'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OdooOrderItem {
  product_name: string
  quantity: number
  /** Unit price HT (excl. VAT) */
  unit_price_ht: number
  /** VAT rate percent: 0, 6, or 21 */
  vat_rate: number
  width_cm?: number | null
  height_cm?: number | null
  finitions_summary?: Array<{ label: string; value: string }> | null
  /** Production delay in working days — used to compute invoice_date_due */
  delai_days?: number | null
  /** Odoo account code (ex: "700000") — maps to account.account in Odoo */
  odoo_account_code?: string | null
}

export interface SyncOrderParams {
  orderId?: string
  orderNumber: string
  clientName: string
  clientEmail: string
  vatNumber?: string | null
  /** Client's own optional reference (PO number etc.) */
  clientReference?: string | null
  items: OdooOrderItem[]
  /** Delivery cost HT */
  deliveryCost?: number | null
  deliveryVatRate?: number
  deliveryLabel?: string
  currency?: string
  /** Supabase service client — when provided, writes back odoo_invoice_id into orders.metadata */
  supabase?: any
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the annotation line that goes after each product line.
 * Returns null if there is nothing to annotate.
 */
function buildItemNote(item: OdooOrderItem): string | null {
  const parts: string[] = []

  if (item.width_cm && item.height_cm) {
    parts.push(`${item.width_cm} × ${item.height_cm} cm`)
  } else if (item.width_cm) {
    parts.push(`${item.width_cm} cm`)
  }

  if (item.finitions_summary?.length) {
    const fins = item.finitions_summary.map(f => `${f.label} : ${f.value}`).join(' | ')
    parts.push(fins)
  }

  return parts.length ? parts.join('  ·  ') : null
}

/**
 * Returns the latest delivery date (ISO) across all items.
 * Falls back to today + 5 working days when no delai_days is set.
 */
function computeDueDate(items: OdooOrderItem[]): string {
  const maxDays = items.reduce((max, item) => {
    const d = item.delai_days ?? 0
    return d > max ? d : max
  }, 0)
  return addWorkingDaysISO(maxDays > 0 ? maxDays : 5)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire-and-forget: create a draft invoice in Odoo for the given order.
 * Errors are caught and logged — never propagated to the caller.
 */
export async function syncOrderToOdoo(params: SyncOrderParams): Promise<void> {
  if (!isOdooConfigured()) return

  const {
    orderId,
    orderNumber,
    clientName,
    clientEmail,
    vatNumber,
    clientReference,
    items,
    deliveryCost,
    deliveryVatRate = 21,
    deliveryLabel = 'Livraison',
    currency = 'EUR',
    supabase,
  } = params

  try {
    const lines: OdooInvoiceLine[] = []

    // ── Ligne simple : référence commande ─────────────────────────────────────
    // display_type 'line_section' → apparaît comme titre de section sans montant
    lines.push({
      display_type: 'line_section',
      name: `Commande ${orderNumber}`,
    })

    // ── Une ligne par article ─────────────────────────────────────────────────
    for (const item of items) {
      // Détail dimensions + finitions → intégré dans la description (2e ligne visuelle)
      const detail = buildItemNote(item)
      const lineName = detail
        ? `${item.product_name}\n${detail}`
        : item.product_name

      lines.push({
        name:               lineName,
        quantity:           item.quantity,
        price_unit:         Math.round(item.unit_price_ht * 100) / 100,
        tax_rate_percent:   item.vat_rate,
        odoo_account_code:  item.odoo_account_code ?? undefined,
      })
    }

    // ── Livraison ─────────────────────────────────────────────────────────────
    if (deliveryCost && deliveryCost > 0) {
      lines.push({
        name:             deliveryLabel,
        quantity:         1,
        price_unit:       Math.round(deliveryCost * 100) / 100,
        tax_rate_percent: deliveryVatRate,
      })
    }

    const invoice_date_due = computeDueDate(items)

    const result = await createOdooInvoice({
      client_name:      clientName,
      client_email:     clientEmail,
      vat_number:       vatNumber ?? null,
      client_reference: clientReference || null,
      order_number:     orderNumber,
      lines,
      currency,
      invoice_date_due,
    })

    console.log(`[odoo] Draft invoice created: ${result.invoice_name} (id=${result.invoice_id}) for ${orderNumber}`)

    // ── Write back invoice id into order metadata (merge) ────────────────────
    if (supabase && orderId) {
      const { data: current } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single()
      const merged = {
        ...(current?.metadata ?? {}),
        odoo_invoice_id:   result.invoice_id,
        odoo_invoice_name: result.invoice_name,
      }
      await supabase
        .from('orders')
        .update({ metadata: merged })
        .eq('id', orderId)
    }
  } catch (err) {
    console.error(`[odoo] Failed to sync order ${orderNumber}:`, err)
    // Non-blocking — order already confirmed, just log
  }
}
