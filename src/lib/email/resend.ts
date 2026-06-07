/**
 * Fonctions d'envoi d'emails Comink via Resend
 * Tous les emails sont en français, design bleu/blanc avec logo Comink.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.be'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

/**
 * Wrapper Resend qui lève une vraie exception si l'API retourne une erreur.
 * Le SDK Resend v2 ne throw pas — il retourne { data, error }.
 * Sans ce wrapper, les erreurs sont silencieuses et l'email paraît envoyé.
 */
async function sendEmail(params: Parameters<typeof resend.emails.send>[0]) {
  const { data, error } = await resend.emails.send(params)
  if (error) {
    throw new Error(`Resend error (${error.name}): ${error.message}`)
  }
  return data
}

const LOGO_URL =
  'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

// ─── Header / Footer HTML helpers ────────────────────────────────────────────

function emailHeader(): string {
  return `
  <div style="background:#1e3a5f;padding:28px 32px;text-align:center">
    <img src="${LOGO_URL}" height="44" alt="Comink" style="filter:brightness(0) invert(1)" />
  </div>`
}

function emailFooter(): string {
  return `
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7">
      Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique<br/>
      +32 4 233 01 38 · <a href="mailto:info@comink.be" style="color:#94a3b8">info@comink.be</a>
    </p>
  </div>`
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08)">
  ${emailHeader()}
  <div style="padding:36px 32px">${content}</div>
  ${emailFooter()}
</div>
</body>
</html>`
}

// ─── 1. Confirmation de commande au client ────────────────────────────────────

interface OrderConfirmationParams {
  order_number: string
  client_name: string
  client_email: string
  items: Array<{
    description?: string
    product?: string | Record<string, unknown>
    quantity?: number
    unit_price?: number
    unit_price_ht?: number
    total_price?: number
    width_cm?: number
    height_cm?: number
  }>
  total: number
  delivery_method?: string
}

export async function sendOrderConfirmationEmail(order: OrderConfirmationParams) {
  const linesHtml = order.items
    .map((item) => {
      const productName =
        item.description ||
        (typeof item.product === 'object' && item.product !== null
          ? (item.product as Record<string, unknown>).name as string
          : String(item.product || ''))
      const unitPrice = item.unit_price ?? item.unit_price_ht ?? 0
      const qty = item.quantity ?? 1
      const totalLine = item.total_price ?? qty * unitPrice
      const dims =
        item.width_cm && item.height_cm
          ? ` — ${item.width_cm} × ${item.height_cm} cm`
          : ''
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
            <div style="font-weight:600;color:#1e293b">${productName}${dims}</div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569">${qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569">${fmt(unitPrice)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b">${fmt(totalLine)}</td>
        </tr>`
    })
    .join('')

  const deliveryLabel: Record<string, string> = {
    pickup: 'Enlèvement sur place',
    delivery: 'Livraison à domicile',
    express: 'Livraison express',
  }
  const deliveryText = order.delivery_method
    ? deliveryLabel[order.delivery_method] || order.delivery_method
    : 'À définir'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f">Commande confirmée !</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">
      Bonjour <strong>${order.client_name}</strong>,<br/>
      Merci pour votre commande <strong>#${order.order_number}</strong>. Nous allons la traiter dans les meilleurs délais.
    </p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">DESCRIPTION</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;width:50px">QTÉ</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;width:100px">P.U.</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;width:100px">TOTAL</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr style="font-size:18px;font-weight:700;border-top:2px solid #e2e8f0">
        <td style="padding:12px 0 4px;color:#1e293b">Total TTC</td>
        <td style="padding:12px 0 4px;text-align:right;color:#1e3a5f">${fmt(order.total)}</td>
      </tr>
    </table>

    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em">Mode de livraison</p>
      <p style="margin:0;color:#1e293b;font-size:14px">${deliveryText}</p>
    </div>

    <div style="text-align:center;margin-bottom:8px">
      <a href="${SITE_URL}/compte" style="display:inline-block;background:#1e3a5f;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Suivre ma commande →
      </a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin:12px 0 0">
      Des questions ? Répondez à cet email ou appelez-nous au +32 4 233 01 38.
    </p>`

  return sendEmail({
    from: FROM,
    to: order.client_email,
    subject: `Comink — Confirmation de commande #${order.order_number}`,
    html: emailWrapper(content),
  })
}

// ─── 2. Envoi devis au client avec lien de validation ─────────────────────────

interface QuoteToClientParams {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  total: number
  public_token: string
}

export async function sendQuoteToClientEmail(quote: QuoteToClientParams) {
  const quoteUrl = `${SITE_URL}/devis/view/${quote.public_token}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f">Votre devis est prêt 📋</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">
      Bonjour <strong>${quote.client_name}</strong>,<br/>
      Nous avons préparé le devis <strong>#${quote.quote_number}</strong> pour vous. Vous pouvez le consulter, le valider et passer commande directement en ligne.
    </p>

    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center">
      <p style="margin:0 0 6px;font-size:14px;color:#475569">Montant total TTC</p>
      <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#1e3a5f">${fmt(quote.total)}</p>
      <a href="${quoteUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Voir et valider mon devis →
      </a>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:20px 0 0">
      Ce lien vous permet de consulter le détail de votre devis et de le valider en un clic pour passer commande.
      Si vous avez des questions ou souhaitez des modifications, répondez simplement à cet email.
    </p>`

  return sendEmail({
    from: FROM,
    to: quote.client_email,
    subject: `Comink — Devis #${quote.quote_number}`,
    html: emailWrapper(content),
  })
}

// ─── 3. Notification fichier prêt (production) ───────────────────────────────

interface FileReadyParams {
  client_name: string
  client_email: string
  order_number: string
  product_name: string
}

export async function sendFileReadyEmail(line: FileReadyParams) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f">Votre fichier est prêt !</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">
      Bonjour <strong>${line.client_name}</strong>,<br/>
      Votre fichier pour la commande <strong>#${line.order_number}</strong> est prêt pour impression.
    </p>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em">Produit en cours de fabrication</p>
      <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600">${line.product_name}</p>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px">
      Notre équipe de production a validé votre fichier et va lancer l'impression.
      Vous recevrez une notification dès que votre commande sera prête.
    </p>

    <div style="text-align:center">
      <a href="${SITE_URL}/compte" style="display:inline-block;background:#1e3a5f;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Suivre ma commande →
      </a>
    </div>`

  return sendEmail({
    from: FROM,
    to: line.client_email,
    subject: `Comink — Fichier validé pour la commande #${line.order_number}`,
    html: emailWrapper(content),
  })
}

// ─── 4. Rappel paiement virement ─────────────────────────────────────────────

interface PaymentReminderParams {
  order_number: string
  client_name: string
  client_email: string
  total: number
  bank_details: {
    iban?: string
    bic?: string
    beneficiary?: string
    communication?: string
  }
}

export async function sendPaymentReminderEmail(order: PaymentReminderParams) {
  const iban = order.bank_details.iban || 'BE XX XXXX XXXX XXXX'
  const bic = order.bank_details.bic || 'GEBABEBB'
  const beneficiary = order.bank_details.beneficiary || 'Comink SRL'
  const communication = order.bank_details.communication || `CMD-${order.order_number}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f">Rappel de paiement</h1>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">
      Bonjour <strong>${order.client_name}</strong>,<br/>
      Nous n'avons pas encore reçu le paiement de votre commande <strong>#${order.order_number}</strong> d'un montant de <strong>${fmt(order.total)}</strong>.
      Voici les coordonnées bancaires pour effectuer votre virement :
    </p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">Coordonnées bancaires</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="padding:4px 0;color:#64748b;width:140px">Bénéficiaire</td>
          <td style="padding:4px 0;font-weight:600;color:#1e293b">${beneficiary}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b">IBAN</td>
          <td style="padding:4px 0;font-weight:600;color:#1e293b;font-family:monospace">${iban}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b">BIC</td>
          <td style="padding:4px 0;font-weight:600;color:#1e293b;font-family:monospace">${bic}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b">Montant</td>
          <td style="padding:4px 0;font-weight:700;color:#1e3a5f;font-size:16px">${fmt(order.total)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b">Communication</td>
          <td style="padding:4px 0;font-weight:600;color:#1e293b;font-family:monospace">${communication}</td>
        </tr>
      </table>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0">
      Si vous avez déjà effectué le virement, veuillez ignorer ce message.
      Pour toute question, contactez-nous à <a href="mailto:info@comink.be" style="color:#1e3a5f">info@comink.be</a>.
    </p>`

  return sendEmail({
    from: FROM,
    to: order.client_email,
    subject: `Comink — Rappel de paiement — Commande #${order.order_number}`,
    html: emailWrapper(content),
  })
}
