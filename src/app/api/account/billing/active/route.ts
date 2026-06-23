import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/account/billing/active
 * Change le compte client actif de l'utilisateur (profiles.client_account_id)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { client_account_id } = await req.json()
  if (!client_account_id) return NextResponse.json({ error: 'client_account_id requis' }, { status: 400 })

  const admin = createAdminClient()

  // Vérifier que l'utilisateur est bien membre de ce compte
  const { data: membership } = await admin
    .from('client_account_members')
    .select('id')
    .eq('client_account_id', client_account_id)
    .eq('profile_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Compte introuvable ou accès non autorisé' }, { status: 403 })

  const { error } = await admin
    .from('profiles')
    .update({ client_account_id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
