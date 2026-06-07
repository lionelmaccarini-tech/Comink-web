import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { sent_by } = await req.json().catch(() => ({}))
    const supabase = await createServiceClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (!quote.client_email) return NextResponse.json({ error: 'Email client manquant' }, { status: 400 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
    const lines: any[] = Array.isArray(quote.items) ? quote.items : []

    // Build line items HTML
    const linesHtml = lines.map((line: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
          <div style="font-weight:600;color:#1e293b">${line.description || ''}</div>
          ${line.details ? `<div style="color:#64748b;font-size:12px;margin-top:2px">${line.details}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569">${line.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569">${fmt(line.unit_price_ht ?? 0)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b">${fmt((line.quantity ?? 1) * (line.unit_price_ht ?? 0))}</td>
      </tr>
    `).join('')

    const validUntil = quote.valid_until
      ? new Date(quote.valid_until).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:#1e293b;padding:28px 32px;text-align:center">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="40" alt="Comink" style="filter:brightness(0) invert(1)"/>
  </div>

  <!-- Body -->
  <div style="padding:32px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e293b">Votre devis est prêt 📋</h1>
    <p style="margin:0 0 24px;color:#64748b">Bonjour ${quote.client_name},<br/>Veuillez trouver ci-dessous votre devis <strong>#${quote.quote_number}</strong>.</p>

    ${quote.reference ? `<p style="margin:0 0 20px;color:#64748b;font-size:14px">Votre référence : <strong>${quote.reference}</strong></p>` : ''}

    <!-- Lines table -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">DESCRIPTION</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">QTÉ</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">P.U. HT</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">TOTAL HT</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <!-- Totals -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr>
        <td style="padding:4px 0;color:#64748b">Sous-total HTVA</td>
        <td style="padding:4px 0;text-align:right;color:#1e293b">${fmt(quote.subtotal ?? 0)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#64748b">TVA</td>
        <td style="padding:4px 0;text-align:right;color:#1e293b">${fmt(quote.tax ?? 0)}</td>
      </tr>
      <tr style="font-size:18px;font-weight:700;border-top:2px solid #e2e8f0">
        <td style="padding:12px 0 4px;color:#1e293b">Total TTC</td>
        <td style="padding:12px 0 4px;text-align:right;color:#2563eb">${fmt(quote.total ?? 0)}</td>
      </tr>
    </table>

    ${validUntil ? `<p style="color:#f59e0b;font-size:13px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:24px">⏳ Ce devis est valable jusqu'au <strong>${validUntil}</strong></p>` : ''}

    ${quote.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;color:#475569;font-size:14px"><strong>Remarques :</strong><br/>${quote.notes.replace(/\n/g, '<br/>')}</div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px">
      <a href="${siteUrl}/compte/devis/${quote.id}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Consulter et accepter le devis
      </a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin:12px 0 0">Ou répondez simplement à cet email pour toute question.</p>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">
      Comink — Rue de Bruxelles 174h, 4340 Awans<br/>
      +32 4 233 01 38 · info@comink.be
    </p>
  </div>
</div>
</body>
</html>`

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@comink.be',
      to: quote.client_email,
      subject: `Comink — Devis #${quote.quote_number}`,
      html,
    })
    if ((emailResult as any).error) {
      const e = (emailResult as any).error
      throw new Error(`Resend error (${e.name ?? 'unknown'}): ${e.message ?? JSON.stringify(e)}`)
    }

    // Update status to 'sent' + pipeline to 'quoted'
    await supabase.from('quotes').update({
      status: 'sent',
      pipeline_stage: 'quoted',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // Log activity
    await supabase.from('crm_activities').insert({
      quote_id:   id,
      type:       'email',
      content:    `Devis envoyé par email à ${quote.client_email}`,
      old_stage:  quote.pipeline_stage,
      new_stage:  'quoted',
      created_by: sent_by || null,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[crm/quotes/send POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur lors de l\'envoi' }, { status: 500 })
  }
}
