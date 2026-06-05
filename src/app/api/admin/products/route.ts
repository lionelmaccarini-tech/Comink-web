import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/** Strip one unknown column from payload based on Supabase error message */
function stripUnknownColumn(payload: Record<string, any>, errorMsg: string): Record<string, any> {
  const match = errorMsg.match(/column "?([a-z_]+)"? of relation/)
  if (match) {
    const col = match[1]
    const { [col]: _, ...rest } = payload
    return rest
  }
  return payload
}

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const body = await req.json()

    if (!body.name) return NextResponse.json({ error: 'name requis' }, { status: 400 })

    const slug = String(body.name)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    let payload: Record<string, any> = { ...body, slug: `${slug}-${Date.now()}` }
    let { data, error } = await supabase.from('products').insert(payload).select().single()

    // Retry en boucle : retire les colonnes inconnues une à une (max 15 tentatives)
    let attempts = 0
    while (error && (error.message.includes('does not exist') || error.message.includes('column')) && attempts < 15) {
      console.warn(`[products POST] colonne inconnue, tentative ${attempts + 1}: ${error.message}`)
      payload = stripUnknownColumn(payload, error.message)
      const retry = await supabase.from('products').insert(payload).select().single()
      data = retry.data; error = retry.error
      attempts++
    }

    if (error) {
      console.error('[products POST] erreur finale:', error.message, '| payload keys:', Object.keys(payload))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[products POST] exception:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const body = await req.json()
    const { id, ...rest } = body

    let payload = rest
    let { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()

    let attempts = 0
    while (error && (error.message.includes('does not exist') || error.message.includes('column')) && attempts < 15) {
      payload = stripUnknownColumn(payload, error.message)
      const retry = await supabase.from('products').update(payload).eq('id', id).select().single()
      data = retry.data; error = retry.error
      attempts++
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
