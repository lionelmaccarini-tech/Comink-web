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
