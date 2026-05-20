import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend/client'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, subject, message } = await req.json()

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@comink.be',
      to: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@comink.be',
      reply_to: email,
      subject: subject ? `[Comink] ${subject} — ${name}` : `[Comink] Message de ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2>Nouveau message via comink.be</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:120px">Nom</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:8px;font-weight:bold">Téléphone</td><td style="padding:8px">${phone}</td></tr>` : ''}
            ${subject ? `<tr style="background:#f8fafc"><td style="padding:8px;font-weight:bold">Sujet</td><td style="padding:8px">${subject}</td></tr>` : ''}
          </table>
          <div style="margin-top:16px;padding:16px;background:#f8fafc;border-radius:8px;white-space:pre-wrap">${message}</div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
