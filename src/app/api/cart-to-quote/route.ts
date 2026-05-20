import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { items, orderReference, vatNumber } = body

    // Get quote validity days from app_settings
    const serviceClient = await createServiceClient()
    const { data: settingRow } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', 'quote_validity_days')
      .single()

    const validityDays = settingRow ? parseInt(settingRow.value) : 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validityDays)

    const quoteNumber = generateOrderNumber().replace('CMK', 'DEV')
    const total = (items as any[]).reduce((sum: number, item: any) => sum + (item.total_price ?? 0), 0)

    const { data, error } = await serviceClient
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        user_id: user.id,
        client_email: user.email,
        cart_items: items,
        reference: orderReference || null,
        vat_number: vatNumber || null,
        expires_at: expiresAt.toISOString(),
        status: 'draft',
        items: [],
        subtotal: total,
        tax: 0,
        total,
      })
      .select('id, quote_number')
      .single()

    if (error) throw error

    return NextResponse.json({ quoteId: data.id, quoteNumber: data.quote_number })
  } catch (err) {
    console.error('[cart-to-quote POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('quotes')
      .select('id, quote_number, reference, cart_items, total, status, created_at, expires_at, vat_number')
      .or(`user_id.eq.${user.id},client_email.eq.${user.email}`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[cart-to-quote GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    // Soft delete — only if owned by user
    const { error } = await serviceClient
      .from('quotes')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cart-to-quote DELETE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
