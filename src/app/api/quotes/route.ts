import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendQuoteEmail } from '@/lib/resend/client'
import { generateOrderNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, company, message, budget, deadline } = body

    const supabase = await createServiceClient()
    const quoteNumber = generateOrderNumber().replace('CMK', 'DEV')

    const { data, error } = await supabase.from('quotes').insert({
      quote_number: quoteNumber,
      client_name: name,
      client_email: email,
      client_phone: phone,
      client_company: company,
      notes: `Budget: ${budget}\nÉchéance: ${deadline}\n\n${message}`,
      status: 'draft',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    }).select().single()

    if (error) throw error

    // Email interne
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: process.env.RESEND_FROM_EMAIL,
        subject: `Nouvelle demande de devis - ${name}`,
        message: `Nom: ${name}\nEmail: ${email}\nTél: ${phone}\nSociété: ${company}\nBudget: ${budget}\nÉchéance: ${deadline}\n\n${message}`,
      }),
    })

    return NextResponse.json({ success: true, quoteNumber })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
