import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { supabase: authClient as any, user: null, profile: null }
  const supabase = await createServiceClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return { supabase, user: null, profile: null }
  }
  return { supabase, user, profile }
}

export async function GET() {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { data, error } = await supabase
      .from('production_statuses')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[production/statuses GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const body = await req.json()
    const { name, color, sort_order, is_initial, is_final } = body

    const { data, error } = await supabase
      .from('production_statuses')
      .insert({ name, color: color || '#94a3b8', sort_order: sort_order ?? 0, is_initial: is_initial ?? false, is_final: is_final ?? false })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[production/statuses POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
