import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { supabase, user: null }
  return { supabase, user }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const { name, color, sort_order, is_initial, is_final } = body

    const patch: Record<string, unknown> = {}
    if (name !== undefined) patch.name = name
    if (color !== undefined) patch.color = color
    if (sort_order !== undefined) patch.sort_order = sort_order
    if (is_initial !== undefined) patch.is_initial = is_initial
    if (is_final !== undefined) patch.is_final = is_final

    const { data, error } = await supabase
      .from('production_statuses')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[production/statuses PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const { error } = await supabase.from('production_statuses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[production/statuses DELETE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
