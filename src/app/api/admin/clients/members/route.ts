import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Add member to client account
export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const { client_account_id, email, role = 'member' } = await req.json()

  // Find profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Aucun utilisateur avec cet email. La personne doit d\'abord créer un compte.' }, { status: 404 })
  }

  // Add to members
  const { data, error } = await supabase
    .from('client_account_members')
    .upsert({ client_account_id, profile_id: profile.id, role }, { onConflict: 'client_account_id,profile_id' })
    .select(`*, profile:profiles(id, email, full_name, phone)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also update profile.client_account_id for easy lookup
  await supabase.from('profiles').update({ client_account_id }).eq('id', profile.id)

  return NextResponse.json(data)
}

// Remove member
export async function DELETE(req: NextRequest) {
  const supabase = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const profile_id = searchParams.get('profile_id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('client_account_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clear profile.client_account_id if no more memberships
  if (profile_id) {
    const { data: remaining } = await supabase
      .from('client_account_members')
      .select('id')
      .eq('profile_id', profile_id)
    if (!remaining?.length) {
      await supabase.from('profiles').update({ client_account_id: null }).eq('id', profile_id)
    }
  }

  return NextResponse.json({ success: true })
}

// Update member role
export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
  const { id, role } = await req.json()

  const { data, error } = await supabase
    .from('client_account_members')
    .update({ role })
    .eq('id', id)
    .select(`*, profile:profiles(id, email, full_name)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
