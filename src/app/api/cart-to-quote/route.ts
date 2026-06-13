import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateOrderNumber } from '@/lib/utils'
import { resend } from '@/lib/resend/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { items, orderReference, vatNumber, deliveryMethod, deliveryCost, deliveryAddress, deliveryCountry } = body

    const serviceClient = await createServiceClient()

    // Récupérer le profil pour client_name (champ obligatoire)
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const clientName = profile?.full_name || user.email?.split('@')[0] || 'Client'

    // Lire la validité depuis app_settings
    const { data: settingRow } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', 'quote_validity_days')
      .single()

    const validityDays = settingRow ? parseInt(settingRow.value) : 30
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    const quoteNumber = generateOrderNumber().replace('CMK', 'DEV')
    const subtotal        = (items as any[]).reduce((sum: number, item: any) => sum + (item.total_price ?? 0), 0)
    const deliveryCostNum = parseFloat(deliveryCost) || 0
    const totalHT         = subtotal + deliveryCostNum
    const tax             = Math.round(totalHT * 0.21 * 100) / 100
    const total           = Math.round((totalHT + tax) * 100) / 100

    // Mapper les items du panier au format de la table quotes
    const quoteItems = (items as any[]).map((item: any) => {
      const qty         = item.quantity ?? 1
      const productName = item.product?.name ?? item.product_name ?? item.name ?? 'Article'
      const unitPriceHT = item.unit_price || (item.total_price != null ? Math.round(item.total_price / qty * 100) / 100 : 0)
      const totalHT     = item.total_price ?? (unitPriceHT * qty)

      // Construire le résumé des finitions depuis les données du panier
      const finParts: string[] = []
      const finGroups = item.product?.finitions ?? []
      const selFin    = item.selectedFinitions ?? {}
      for (const g of finGroups) {
        const sel = selFin[g.id]
        if (!sel) continue
        const ids    = Array.isArray(sel) ? sel : [sel]
        const labels = (g.options ?? []).filter((o: any) => ids.includes(o.id)).map((o: any) => o.label)
        if (labels.length) finParts.push(`${g.label} : ${labels.join(', ')}`)
      }
      const sidesFinitions = item.product?.sides_finitions
      const selSides = item.selectedSides ?? {}
      if (sidesFinitions?.enabled) {
        for (const side of sidesFinitions.sides ?? []) {
          const optIds = selSides[side.id] ?? []
          const labels = (sidesFinitions.options ?? []).filter((o: any) => optIds.includes(o.id)).map((o: any) => o.label)
          if (labels.length) finParts.push(`${side.label} : ${labels.join(', ')}`)
        }
      }
      if (item.selectedDelai?.label) finParts.push(item.selectedDelai.label)

      return {
        product_id:      item.product_id ?? item.id,
        product_name:    productName,
        quantity:        qty,
        unit_price:      unitPriceHT,
        total:           Math.round(totalHT * 100) / 100,
        width_cm:        item.width_cm ?? item.width,
        height_cm:       item.height_cm ?? item.height,
        finitions_label: finParts.join(' · ') || undefined,
        reference:       item.reference  || undefined,
        file_url:        item.file_url   || undefined,
        file_name:       item.file_name  || undefined,
        file_analysis:   item.file_analysis ?? undefined,
      }
    })

    const { data, error } = await serviceClient
      .from('quotes')
      .insert({
        quote_number:   quoteNumber,
        user_id:        user.id,
        client_name:    clientName,
        client_email:   user.email,
        items:            quoteItems,
        reference:        orderReference || null,
        vat_number:       vatNumber || null,
        valid_until:      validUntil.toISOString(),
        status:           'draft',
        source:           'web',
        subtotal,
        tax,
        total,
        delivery_method:  deliveryMethod || null,
        delivery_cost:    deliveryCostNum || 0,
        delivery_address: deliveryAddress || null,
        delivery_country: deliveryCountry || 'BE',
      })
      .select('id, quote_number')
      .single()

    if (error) throw error

    // ── Envoi email de confirmation au client ─────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
    const FROM    = process.env.RESEND_FROM_EMAIL   || 'noreply@comink.be'
    const INTERNAL = process.env.RESEND_TO_EMAIL    || 'info@comink.be'
    const quoteUrl = `${siteUrl}/compte?tab=devis`

    const deliveryLabels: Record<string, string> = {
      pickup:  'Enlèvement atelier',
      parcel:  'Expédition colis',
      express: 'Livraison express',
    }

    const itemsHtml = quoteItems.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
          <strong style="color:#1e293b">${item.product_name}</strong>
          ${item.finitions_label ? `<br/><span style="font-size:11px;color:#64748b">${item.finitions_label}</span>` : ''}
          ${item.width_cm && item.height_cm ? `<br/><span style="font-size:11px;color:#94a3b8">${item.width_cm} × ${item.height_cm} cm</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569">${item.unit_price.toFixed(2)} €</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b">${item.total.toFixed(2)} €</td>
      </tr>
    `).join('')

    const deliveryRow = (deliveryMethod && deliveryCostNum > 0) ? `
      <tr>
        <td colspan="3" style="padding:8px 12px;color:#475569;font-size:13px">${deliveryLabels[deliveryMethod] ?? deliveryMethod}${deliveryAddress ? ` · ${deliveryAddress}` : ''}</td>
        <td style="padding:8px 12px;text-align:right;color:#475569">${deliveryCostNum.toFixed(2)} €</td>
      </tr>` : (deliveryMethod === 'pickup' ? `
      <tr>
        <td colspan="3" style="padding:8px 12px;color:#475569;font-size:13px">Enlèvement atelier${deliveryAddress ? ` · ${deliveryAddress}` : ''}</td>
        <td style="padding:8px 12px;text-align:right;color:#64748b">Gratuit</td>
      </tr>` : '')

    const validUntilStr = validUntil.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })

    const clientHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#1e293b;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="36" alt="Comink" style="filter:brightness(0) invert(1)"/>
    <span style="color:#94a3b8;font-size:13px">Devis ${data.quote_number}</span>
  </div>
  <div style="padding:32px">
    <h1 style="margin:0 0 8px;font-size:20px;color:#1e293b">Votre devis est enregistré ✅</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">
      Bonjour ${clientName},<br/>
      Votre devis <strong>${data.quote_number}</strong> a bien été créé. Il est valable jusqu'au <strong>${validUntilStr}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Désignation</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Qté</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">P.U. HT</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        ${deliveryRow}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;color:#475569;font-size:13px">Sous-total HT</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px">${subtotal.toFixed(2)} €</td>
        </tr>
        ${deliveryCostNum > 0 ? `<tr><td colspan="3" style="padding:4px 12px;text-align:right;color:#475569;font-size:13px">Livraison HT</td><td style="padding:4px 12px;text-align:right;font-size:13px">${deliveryCostNum.toFixed(2)} €</td></tr>` : ''}
        <tr>
          <td colspan="3" style="padding:4px 12px;text-align:right;color:#475569;font-size:13px">TVA 21%</td>
          <td style="padding:4px 12px;text-align:right;font-size:13px">${tax.toFixed(2)} €</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;font-weight:700;color:#2563eb;font-size:15px;border-top:2px solid #e2e8f0">Total TTC</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;color:#2563eb;font-size:15px;border-top:2px solid #e2e8f0">${total.toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align:center;margin:28px 0">
      <a href="${quoteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Valider le devis et commander →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center">
      Besoin d'une modification ? Contactez-nous à <a href="mailto:info@comink.be" style="color:#2563eb">info@comink.be</a>
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:11px">Comink SRL · Rue de Bruxelles 174h, 4340 Awans · +32 4 233 01 38 · info@comink.be</p>
  </div>
</div>
</body></html>`

    // Email client (non bloquant — on ne laisse pas l'erreur email bloquer la réponse)
    resend.emails.send({
      from: FROM,
      to:   user.email!,
      subject: `Comink — Votre devis ${data.quote_number}`,
      html: clientHtml,
    }).catch(e => console.error('[cart-to-quote email client]', e))

    // Notification interne
    resend.emails.send({
      from: FROM,
      to:   INTERNAL,
      subject: `[Devis client] ${data.quote_number} — ${clientName} — ${total.toFixed(2)} €`,
      html: `<p><strong>Nouveau devis panier</strong></p>
<p>Client : ${clientName} (${user.email})<br/>
Devis : ${data.quote_number}<br/>
Total : ${total.toFixed(2)} €<br/>
Livraison : ${deliveryMethod ? (deliveryLabels[deliveryMethod] ?? deliveryMethod) : 'non définie'}${deliveryAddress ? ` — ${deliveryAddress}` : ''}</p>
<a href="${siteUrl}/crm/quotes">Voir dans le CRM</a>`,
    }).catch(e => console.error('[cart-to-quote email interne]', e))

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
      .select('id, quote_number, reference, items, subtotal, total, status, created_at, valid_until, vat_number')
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
