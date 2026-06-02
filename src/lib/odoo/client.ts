/**
 * Odoo JSON-RPC client — Level 1 integration
 *
 * Env vars required:
 *   ODOO_URL        https://your-odoo.example.com
 *   ODOO_DB         comink
 *   ODOO_USERNAME   api@comink.be
 *   ODOO_API_KEY    clé API générée dans Odoo (Settings → Technical → API Keys)
 */

export interface OdooInvoiceLine {
  /** Line description */
  name: string
  /** undefined / null = regular accounting line */
  display_type?: 'line_note' | 'line_section' | null
  /** Only for regular lines */
  quantity?: number
  price_unit?: number       // HTVA
  tax_rate_percent?: number // 0, 6, 21 …
}

export interface OdooInvoiceInput {
  client_name: string
  client_email: string
  vat_number?: string | null
  /** Client's own optional reference (PO number etc.) → Odoo "ref" field */
  client_reference?: string | null
  /** Comink internal order number → payment_reference */
  order_number: string
  lines: OdooInvoiceLine[]
  currency?: string          // 'EUR' by default
  /** ISO date YYYY-MM-DD — payment due date */
  invoice_date_due?: string | null
}

export interface OdooInvoiceResult {
  invoice_id: number
  invoice_name: string  // ex. "BROUILLON" ou "INV/2026/0042"
}

// ─── JSON-RPC low-level ───────────────────────────────────────────────────────

let _uid: number | null = null

async function rpc(
  url: string,
  service: 'common' | 'object',
  method: string,
  args: unknown[],
): Promise<unknown> {
  const res = await fetch(`${url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params: { service, method, args },
    }),
  })
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}`)
  const json = await res.json() as { result?: unknown; error?: { message: string; data?: { message: string } } }
  if (json.error) {
    const msg = json.error.data?.message || json.error.message
    throw new Error(`Odoo RPC error: ${msg}`)
  }
  return json.result
}

async function getUid(url: string, db: string, username: string, apiKey: string): Promise<number> {
  if (_uid !== null) return _uid
  const uid = await rpc(url, 'common', 'authenticate', [db, username, apiKey, {}]) as number
  if (!uid) throw new Error('Odoo authentication failed — check ODOO_USERNAME / ODOO_API_KEY')
  _uid = uid
  return uid
}

async function callKw(
  url: string, db: string, uid: number, apiKey: string,
  model: string, method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<unknown> {
  return rpc(url, 'object', 'execute_kw', [db, uid, apiKey, model, method, args, kwargs])
}

// ─── Partner (client) ─────────────────────────────────────────────────────────

async function upsertPartner(
  url: string, db: string, uid: number, apiKey: string,
  name: string, email: string, vatNumber?: string | null,
): Promise<number> {
  const existing = await callKw(url, db, uid, apiKey, 'res.partner', 'search_read',
    [[['email', '=ilike', email]]],
    { fields: ['id', 'name'], limit: 1 },
  ) as Array<{ id: number; name: string }>

  if (existing.length > 0) {
    await callKw(url, db, uid, apiKey, 'res.partner', 'write',
      [[existing[0].id], {
        name,
        ...(vatNumber ? { vat: vatNumber } : {}),
      }],
    )
    return existing[0].id
  }

  const partnerId = await callKw(url, db, uid, apiKey, 'res.partner', 'create',
    [{
      name,
      email,
      customer_rank: 1,
      ...(vatNumber ? { vat: vatNumber } : {}),
    }],
  ) as number
  return partnerId
}

// ─── Tax lookup ───────────────────────────────────────────────────────────────

const _taxCache: Record<string, number[]> = {}

async function getTaxIds(
  url: string, db: string, uid: number, apiKey: string,
  ratePercent: number,
): Promise<number[]> {
  const key = String(ratePercent)
  if (_taxCache[key]) return _taxCache[key]

  if (ratePercent === 0) {
    _taxCache[key] = []
    return []
  }

  const taxes = await callKw(url, db, uid, apiKey, 'account.tax', 'search_read',
    [[
      ['type_tax_use', '=', 'sale'],
      ['amount', '=', ratePercent],
      ['active', '=', true],
    ]],
    { fields: ['id', 'name', 'amount'], limit: 1 },
  ) as Array<{ id: number; name: string; amount: number }>

  const ids = taxes.map(t => t.id)
  _taxCache[key] = ids
  return ids
}

// ─── Currency ─────────────────────────────────────────────────────────────────

const _currencyCache: Record<string, number> = {}

async function getCurrencyId(
  url: string, db: string, uid: number, apiKey: string, code: string,
): Promise<number> {
  if (_currencyCache[code]) return _currencyCache[code]
  const currencies = await callKw(url, db, uid, apiKey, 'res.currency', 'search_read',
    [[['name', '=', code]]],
    { fields: ['id'], limit: 1 },
  ) as Array<{ id: number }>
  if (!currencies.length) throw new Error(`Devise "${code}" introuvable dans Odoo`)
  _currencyCache[code] = currencies[0].id
  return currencies[0].id
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a draft invoice (account.move) in Odoo.
 *
 * Lines with display_type 'line_section' or 'line_note' are rendered as
 * visual separators / annotations without any amount.
 */
export async function createOdooInvoice(input: OdooInvoiceInput): Promise<OdooInvoiceResult> {
  const url    = process.env.ODOO_URL?.replace(/\/$/, '')
  const db     = process.env.ODOO_DB
  const user   = process.env.ODOO_USERNAME
  const apiKey = process.env.ODOO_API_KEY

  if (!url || !db || !user || !apiKey) {
    throw new Error('Odoo non configuré — vérifiez ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY')
  }

  const uid = await getUid(url, db, user, apiKey)

  // 1. Upsert partner
  const partnerId = await upsertPartner(url, db, uid, apiKey,
    input.client_name, input.client_email, input.vat_number)

  // 2. Build invoice lines
  const invoiceLines = await Promise.all(
    input.lines.map(async (line) => {
      // Section / note lines — no price, no tax
      if (line.display_type === 'line_section' || line.display_type === 'line_note') {
        return [0, 0, {
          display_type: line.display_type,
          name:         line.name,
        }]
      }

      // Regular accounting line
      const taxIds = await getTaxIds(url, db, uid, apiKey, line.tax_rate_percent ?? 0)
      return [0, 0, {
        name:       line.name,
        quantity:   line.quantity   ?? 1,
        price_unit: line.price_unit ?? 0,
        tax_ids:    taxIds.length ? [[6, 0, taxIds]] : [],
      }]
    })
  )

  // 3. Create draft invoice
  const invoiceId = await callKw(url, db, uid, apiKey, 'account.move', 'create',
    [{
      move_type:           'out_invoice',
      partner_id:          partnerId,
      // ref = client's own reference (their PO number etc.)
      ref:                 input.client_reference || false,
      // payment_reference = Comink order number (shown on bank statement)
      payment_reference:   input.order_number,
      invoice_line_ids:    invoiceLines,
      currency_id:         await getCurrencyId(url, db, uid, apiKey, input.currency ?? 'EUR'),
      ...(input.invoice_date_due ? { invoice_date_due: input.invoice_date_due } : {}),
    }],
  ) as number

  // 4. Fetch the generated name
  const result = await callKw(url, db, uid, apiKey, 'account.move', 'read',
    [[invoiceId]], { fields: ['id', 'name'] },
  ) as Array<{ id: number; name: string }>

  return { invoice_id: invoiceId, invoice_name: result[0]?.name || 'Brouillon' }
}

/**
 * Returns true if Odoo is configured (env vars present).
 */
export function isOdooConfigured(): boolean {
  return !!(process.env.ODOO_URL && process.env.ODOO_DB &&
            process.env.ODOO_USERNAME && process.env.ODOO_API_KEY)
}

// ─── Invoices & Follow-up ─────────────────────────────────────────────────────

export interface OdooInvoice {
  id: number
  name: string
  invoice_date: string
  invoice_date_due: string
  ref: string | false
  amount_total: number
  amount_residual: number
  payment_state: 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed'
  state: 'draft' | 'posted' | 'cancel'
}

export interface PartnerFollowupInfo {
  blocked: boolean
  level: number
  overdue_amount: number
  oldest_due_date: string | null
}

/**
 * Récupère toutes les factures postées d'un client par email.
 */
export async function getPartnerInvoices(email: string): Promise<OdooInvoice[]> {
  if (!isOdooConfigured()) return []
  try {
    const url    = process.env.ODOO_URL!.replace(/\/$/, '')
    const db     = process.env.ODOO_DB!
    const user   = process.env.ODOO_USERNAME!
    const apiKey = process.env.ODOO_API_KEY!

    const uid = await getUid(url, db, user, apiKey)

    // Find partner id by email
    const partners = await callKw(url, db, uid, apiKey, 'res.partner', 'search_read',
      [[['email', '=ilike', email]]],
      { fields: ['id'], limit: 1 },
    ) as Array<{ id: number }>

    if (!partners.length) return []
    const partnerId = partners[0].id

    const invoices = await callKw(url, db, uid, apiKey, 'account.move', 'search_read',
      [[
        ['partner_id', '=', partnerId],
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
      ]],
      {
        fields: ['name', 'invoice_date', 'invoice_date_due', 'ref', 'amount_total', 'amount_residual', 'payment_state', 'state'],
        order: 'invoice_date desc',
        limit: 100,
      },
    ) as OdooInvoice[]

    return invoices
  } catch (err) {
    console.error('[Odoo] getPartnerInvoices error:', err)
    return []
  }
}

/**
 * Récupère le statut de relance d'un client (niveau de rappel).
 * Niveau 0: RAS — Niveau 1: Rappel envoyé — Niveau 2: BLOQUÉ
 *
 * - Niveau 2 (bloqué) : factures impayées > 60 jours après échéance OU x_order_blocked = true
 * - Niveau 1 : factures impayées > 15 jours après échéance
 * - Niveau 0 : tout est ok
 */
export async function getPartnerFollowupInfo(email: string): Promise<PartnerFollowupInfo> {
  const empty: PartnerFollowupInfo = { blocked: false, level: 0, overdue_amount: 0, oldest_due_date: null }
  if (!isOdooConfigured()) return empty
  try {
    const url    = process.env.ODOO_URL!.replace(/\/$/, '')
    const db     = process.env.ODOO_DB!
    const user   = process.env.ODOO_USERNAME!
    const apiKey = process.env.ODOO_API_KEY!

    const uid = await getUid(url, db, user, apiKey)

    // Find partner with follow-up fields
    let partners: Array<{ id: number; credit?: number; x_order_blocked?: boolean }>
    try {
      partners = await callKw(url, db, uid, apiKey, 'res.partner', 'search_read',
        [[['email', '=ilike', email]]],
        { fields: ['id', 'credit', 'x_order_blocked'], limit: 1 },
      ) as Array<{ id: number; credit?: number; x_order_blocked?: boolean }>
    } catch {
      // x_order_blocked may not exist — retry without it
      partners = await callKw(url, db, uid, apiKey, 'res.partner', 'search_read',
        [[['email', '=ilike', email]]],
        { fields: ['id', 'credit'], limit: 1 },
      ) as Array<{ id: number; credit?: number }>
    }

    if (!partners.length) return empty
    const partner = partners[0]
    const forceBlocked = partner.x_order_blocked === true

    // Fetch unpaid invoices
    const invoices = await callKw(url, db, uid, apiKey, 'account.move', 'search_read',
      [[
        ['partner_id', '=', partner.id],
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['payment_state', 'in', ['not_paid', 'partial']],
      ]],
      { fields: ['invoice_date_due', 'amount_residual'], limit: 200 },
    ) as Array<{ invoice_date_due: string; amount_residual: number }>

    if (!invoices.length && !forceBlocked) return empty

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let maxDaysOverdue = 0
    let totalOverdue = 0
    let oldestDueDate: string | null = null

    for (const inv of invoices) {
      if (!inv.invoice_date_due) continue
      const due = new Date(inv.invoice_date_due)
      due.setHours(0, 0, 0, 0)
      const diffMs = today.getTime() - due.getTime()
      if (diffMs <= 0) continue // not yet due

      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      totalOverdue += inv.amount_residual
      if (daysOverdue > maxDaysOverdue) {
        maxDaysOverdue = daysOverdue
        oldestDueDate = inv.invoice_date_due
      }
    }

    let level = 0
    if (forceBlocked || maxDaysOverdue > 60) level = 2
    else if (maxDaysOverdue > 15) level = 1

    return {
      blocked: level >= 2,
      level,
      overdue_amount: totalOverdue,
      oldest_due_date: oldestDueDate,
    }
  } catch (err) {
    console.error('[Odoo] getPartnerFollowupInfo error:', err)
    return empty
  }
}
