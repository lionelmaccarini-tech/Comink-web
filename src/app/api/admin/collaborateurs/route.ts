import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, company, phone')
    .in('role', ['admin', 'collaborateur', 'producteur'])
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Search a user by email to invite
export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const { email, role } = await req.json()

  // Find existing profile by email
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', email)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Aucun utilisateur trouvé avec cet email. La personne doit d\'abord créer un compte.' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
  const { id, role } = await req.json()

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
