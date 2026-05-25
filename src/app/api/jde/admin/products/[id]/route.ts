import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['name', 'description', 'category', 'point_cost', 'template_url', 'logo_zone', 'active', 'sort_order']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
  }

  updates['updated_at'] = new Date().toISOString()

  const { data: product, error } = await supabase
    .from('jde_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[jde/admin/products/[id] PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params

  // Soft delete: set active = false
  const { error } = await supabase
    .from('jde_products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
