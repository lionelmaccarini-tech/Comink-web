import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('client_accounts')
    .select(`
      *,
      price_list:price_lists(id, name, discount_percent),
      members:client_account_members(
        id, role, created_at,
        profile:profiles(id, email, full_name, phone)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
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
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
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
  const supabase = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('client_accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
