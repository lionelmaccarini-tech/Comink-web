import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin', 'collaborateur'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('carts')
      .select('id, session_id, user_id, client_name, client_email, items, total_ht, item_count, last_seen_at, created_at, converted_at')
      .gt('item_count', 0)
      .is('converted_at', null)
      .order('last_seen_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[admin/carts GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
