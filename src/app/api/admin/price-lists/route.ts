import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('price_lists')
    .select('*, rules:price_list_rules(*)')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()
  const { rules, ...fields } = body
  const { data, error } = await supabase.from('price_lists').insert(fields).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Insert rules if provided
  if (rules?.length) {
    await supabase.from('price_list_rules').insert(rules.map((r: any) => ({ ...r, price_list_id: data.id })))
  }
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
  const { id, rules, ...fields } = await req.json()
  const { data, error } = await supabase.from('price_lists').update(fields).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Replace rules
  if (rules !== undefined) {
    await supabase.from('price_list_rules').delete().eq('price_list_id', id)
    if (rules.length) {
      await supabase.from('price_list_rules').insert(rules.map((r: any) => ({ ...r, price_list_id: id })))
    }
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('price_lists').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
