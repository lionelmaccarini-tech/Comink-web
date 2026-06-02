import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartnerInvoices } from '@/lib/odoo/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const invoices = await getPartnerInvoices(user.email)

    const total_due = invoices.reduce((sum, inv) => sum + (inv.amount_residual ?? 0), 0)

    return NextResponse.json(
      { invoices, total_due },
      {
        headers: { 'Cache-Control': 'max-age=300' },
      },
    )
  } catch (err) {
    console.error('[API] /api/account/invoices error:', err)
    return NextResponse.json({ invoices: [], total_due: 0 }, { status: 200 })
  }
}
