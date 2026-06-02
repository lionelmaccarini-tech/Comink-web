import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartnerFollowupInfo } from '@/lib/odoo/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const info = await getPartnerFollowupInfo(user.email)
    return NextResponse.json(info)
  } catch (err) {
    console.error('[API] /api/account/dunning error:', err)
    return NextResponse.json({ blocked: false, level: 0, overdue_amount: 0, oldest_due_date: null }, { status: 200 })
  }
}
