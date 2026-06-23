import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { session_id, items, total_ht, item_count } = await req.json()
    if (!session_id) return NextResponse.json({ ok: false }, { status: 400 })

    const admin = createAdminClient()

    let user_id: string | null = null
    let client_name: string | null = null
    let client_email: string | null = null

    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        user_id = user.id
        client_email = user.email ?? null
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        client_name = profile?.full_name ?? null
      }
    } catch { /* anonymous visitor */ }

    await admin.from('carts').upsert({
      session_id,
      user_id,
      client_name,
      client_email,
      items: items ?? [],
      total_ht: total_ht ?? 0,
      item_count: item_count ?? 0,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'session_id' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cart/sync]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
