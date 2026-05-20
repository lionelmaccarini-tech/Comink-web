import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'collaborateur'].includes(profile.role)) return null
  return user
}

// GET — list all categories
export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — create new category
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { id, label, display_order = 0, active = true } = body

  if (!id || !label) return NextResponse.json({ error: 'id et label requis' }, { status: 400 })

  const slug = id.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  if (!slug) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({ id: slug, label: label.trim(), display_order, active })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PUT — update category (label, display_order, active)
export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Only allow these fields to be updated
  const allowed = ['label', 'display_order', 'active']
  const payload: Record<string, any> = {}
  for (const key of allowed) {
    if (key in updates) payload[key] = updates[key]
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE — delete category
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const supabase = await createServiceClient()

  // Check if any product uses this category
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `${count} produit(s) utilisent cette catégorie. Réaffectez-les d'abord.` },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
