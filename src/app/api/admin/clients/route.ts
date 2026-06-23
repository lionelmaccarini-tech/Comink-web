import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page   = parseInt(searchParams.get('page') || '1')
  const limit  = 50
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  // Requête simple sans jointures pour éviter la récursion RLS sur client_account_members
  let query = supabase
    .from('client_accounts')
    .select(
      'id, name, email, phone, vat_number, address_line1, city, postal_code, country, is_active, discount_percent, billing_end_of_month, free_shipping, payment_methods_override, delivery_methods_override, payment_deadline_days, price_list_id, notes, created_at, updated_at, client_account_members(count)',
      { count: 'exact' }
    )
    .order('name', { ascending: true })
    .range(from, to)

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,vat_number.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupérer les price lists séparément (sans join pour éviter la récursion)
  const priceListIds = [...new Set((data ?? []).map((c: any) => c.price_list_id).filter(Boolean))]
  let priceListMap: Record<string, any> = {}
  if (priceListIds.length > 0) {
    const { data: pls } = await supabase
      .from('price_lists')
      .select('id, name, discount_percent')
      .in('id', priceListIds)
    ;(pls ?? []).forEach((pl: any) => { priceListMap[pl.id] = pl })
  }

  const enriched = (data ?? []).map((c: any) => ({
    ...c,
    member_count: c.client_account_members?.[0]?.count ?? 0,
    client_account_members: undefined,
    price_list: c.price_list_id ? priceListMap[c.price_list_id] ?? null : null,
  }))

  return NextResponse.json({ data: enriched, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('client_accounts')
    .insert({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      vat_number: body.vat_number || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      postal_code: body.postal_code || null,
      country: body.country || 'BE',
      price_list_id: body.price_list_id || null,
      discount_percent: body.discount_percent || 0,
      notes: body.notes || null,
      is_active: body.is_active ?? true,
      billing_end_of_month: body.billing_end_of_month ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { id, ...rest } = body

  const { data, error } = await supabase
    .from('client_accounts')
    .update(rest)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('client_accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
