import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data: clients, error } = await supabase
    .from('jde_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[jde/admin/clients GET]', error)
    return NextResponse.json({ error: 'Erreur DB' }, { status: 500 })
  }

  return NextResponse.json({ clients: clients ?? [] })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { full_name, company, email, points_balance, notes } = body

  if (!full_name || !email) {
    return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
  }

  // Invite user via Supabase auth admin
  const adminClient = createAdminClient()
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, jde_client: true },
  })

  let userId: string | null = null
  if (inviteError) {
    // User might already exist — try to find them
    const { data: existingList } = await adminClient.auth.admin.listUsers()
    const existing = existingList?.users?.find(u => u.email === email)
    userId = existing?.id ?? null
    if (!userId) {
      console.warn('[jde/admin/clients POST] invite error:', inviteError.message)
    }
  } else {
    userId = inviteData?.user?.id ?? null
  }

  // Create JDE client — utiliser adminClient pour bypass RLS
  const { data: client, error: clientError } = await adminClient
    .from('jde_clients')
    .insert({
      user_id: userId,
      full_name,
      company: company ?? null,
      email,
      points_balance: points_balance ?? 0,
      notes: notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (clientError) {
    console.error('[jde/admin/clients POST]', clientError)
    return NextResponse.json({ error: clientError.message || 'Erreur création client' }, { status: 500 })
  }

  return NextResponse.json({ client }, { status: 201 })
}
