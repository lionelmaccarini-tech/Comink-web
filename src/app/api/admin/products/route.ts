import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function requireAdmin(req: NextRequest) {
  const supabase = await createServiceClient()
  const authHeader = req.headers.get('x-admin-token')
  // Simple: check session via cookie
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'collaborateur'].includes(profile.role)) return null
  return user
}

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** Strip unknown columns from payload if Supabase rejects them (pending migrations) */
function stripUnknownColumn(payload: Record<string, any>, errorMsg: string): Record<string, any> {
  const match = errorMsg.match(/column "?([a-z_]+)"? of relation/)
  if (match) {
    const col = match[1]
    const { [col]: _, ...rest } = payload
    return rest
  }
  return payload
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()

  // Generate slug from name
  const slug = body.name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  let payload = { ...body, slug: `${slug}-${Date.now()}` }
  let { data, error } = await supabase.from('products').insert(payload).select().single()

  // Retry without unknown columns (migration not yet applied)
  if (error?.message?.includes('column') && error.message.includes('does not exist')) {
    payload = stripUnknownColumn(payload, error.message)
    const retry = await supabase.from('products').insert(payload).select().single()
    data = retry.data; error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()
  const { id, ...rest } = body

  let payload = rest
  let { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()

  // Retry without unknown columns (migration not yet applied)
  if (error?.message?.includes('column') && error.message.includes('does not exist')) {
    payload = stripUnknownColumn(payload, error.message)
    const retry = await supabase.from('products').update(payload).eq('id', id).select().single()
    data = retry.data; error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
