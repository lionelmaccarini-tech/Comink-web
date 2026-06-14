import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let name = '', email = '', phone = '', company = '', message = '', budget = '', deadline = ''
    let attachmentUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      name     = (fd.get('name')     as string) || ''
      email    = (fd.get('email')    as string) || ''
      phone    = (fd.get('phone')    as string) || ''
      company  = (fd.get('company')  as string) || ''
      message  = (fd.get('message')  as string) || ''
      budget   = (fd.get('budget')   as string) || ''
      deadline = (fd.get('deadline') as string) || ''

      const attachment = fd.get('attachment') as File | null
      if (attachment && attachment.size > 0) {
        const supabase = await createServiceClient()
        const ext = attachment.name.split('.').pop() || 'bin'
        const path = `devis/${Date.now()}_${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const arrayBuf = await attachment.arrayBuffer()
        const { data: upData, error: upErr } = await supabase.storage
          .from('attachments')
          .upload(path, arrayBuf, {
            contentType: attachment.type || 'application/octet-stream',
            upsert: false,
          })
        if (!upErr && upData) {
          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(upData.path)
          attachmentUrl = publicUrl
        }
      }
    } else {
      // fallback JSON
      const body = await req.json()
      ;({ name, email, phone, company, message, budget, deadline } = body)
    }

    const supabase = await createServiceClient()
    const quoteNumber = generateOrderNumber().replace('CMK', 'DEV')

    const notes = [
      `Budget: ${budget}`,
      `Échéance: ${deadline}`,
      '',
      message,
      attachmentUrl ? `\nFichier joint: ${attachmentUrl}` : '',
    ].filter(l => l !== undefined).join('\n').trim()

    const { data, error } = await supabase.from('quotes').insert({
      quote_number: quoteNumber,
      client_name: name,
      client_email: email,
      client_phone: phone,
      client_company: company,
      notes,
      status: 'draft',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    }).select().single()

    if (error) throw error

    // Email interne
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: process.env.RESEND_FROM_EMAIL,
          subject: `Nouvelle demande de devis - ${name}`,
          message: [
            `Nom: ${name}`,
            `Email: ${email}`,
            `Tél: ${phone}`,
            `Société: ${company}`,
            `Budget: ${budget}`,
            `Échéance: ${deadline}`,
            '',
            message,
            attachmentUrl ? `\nFichier joint: ${attachmentUrl}` : '',
          ].join('\n'),
        }),
      })
    } catch { /* email non critique */ }

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
