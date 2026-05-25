import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data: products, error } = await supabase
    .from('jde_products')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Erreur DB' }, { status: 500 })
  }

  return NextResponse.json({ products: products ?? [] })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { name, description, category, point_cost, template_url, logo_zone, sort_order } = body

  if (!name || point_cost === undefined) {
    return NextResponse.json({ error: 'Nom et coût en points requis' }, { status: 400 })
  }

  const { data: product, error } = await supabase
    .from('jde_products')
    .insert({
      name,
      description: description ?? null,
      category: category ?? null,
      point_cost: Number(point_cost),
      template_url: template_url ?? null,
      logo_zone: logo_zone ?? { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
      sort_order: sort_order ?? 0,
      active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[jde/admin/products POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product }, { status: 201 })
}
