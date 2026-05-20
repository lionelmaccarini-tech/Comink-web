import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.be'

export async function sendOrderConfirmation(to: string, orderNumber: string, total: number) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Comink — Confirmation de commande #${orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="48" alt="Comink" />
        <h1>Votre commande est confirmée ✅</h1>
        <p>Merci pour votre commande <strong>#${orderNumber}</strong>.</p>
        <p>Montant total : <strong>${total.toFixed(2)} €</strong></p>
        <p>Notre équipe va traiter votre commande et vous tiendra informé à chaque étape.</p>
        <hr />
        <p style="color:#64748b;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique<br/>+32 4 233 01 38 · info@comink.be</p>
      </div>
    `,
  })
}

export async function sendQuoteEmail(to: string, quoteNumber: string, quoteUrl: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Comink — Votre devis #${quoteNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="48" alt="Comink" />
        <h1>Votre devis est prêt</h1>
        <p>Nous avons préparé le devis <strong>#${quoteNumber}</strong> pour vous.</p>
        <a href="${quoteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Consulter le devis</a>
        <hr />
        <p style="color:#64748b;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique<br/>+32 4 233 01 38 · info@comink.be</p>
      </div>
    `,
  })
}

export async function sendPickupConfirmation(
  to: string, orderNumber: string, signedBy: string, signatureDataUrl: string, items: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Comink — Confirmation d'enlèvement #${orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="48" alt="Comink" />
        <h1>Confirmation d'enlèvement</h1>
        <p>La commande <strong>#${orderNumber}</strong> a été enlevée par <strong>${signedBy}</strong>.</p>
        <p style="color:#64748b;font-size:13px">Articles : ${items}</p>
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase">Signature</p>
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" style="max-height:80px;border:1px solid #e2e8f0;border-radius:4px" alt="Signature" />` : '<p style="color:#94a3b8">—</p>'}
        </div>
        <hr />
        <p style="color:#64748b;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique<br/>+32 4 233 01 38 · info@comink.be</p>
      </div>
    `,
  })
}

export async function sendFilesExpiryNotice(
  to: string,
  orderNumber: string,
  expiresAt: Date,
  fileLinks: Array<{ name: string; url: string }>,
  siteUrl: string,
) {
  const deadline = expiresAt.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })
  const filesHtml = fileLinks.length > 0
    ? fileLinks.map(f =>
        `<li><a href="${f.url}" style="color:#2563eb">${f.name}</a></li>`
      ).join('')
    : '<li>Fichiers disponibles dans votre espace client</li>'

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Comink — Vos fichiers de commande #${orderNumber} disponibles encore 10 jours`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="48" alt="Comink" />
        <h1>Votre commande #${orderNumber} est finalisée ✅</h1>
        <p>Vos fichiers sources sont disponibles au téléchargement pendant encore <strong>10 jours</strong>, jusqu'au <strong>${deadline}</strong>.</p>
        <p>Après cette date, ils seront automatiquement supprimés de nos serveurs.</p>
        ${fileLinks.length > 0 ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px;font-weight:600;font-size:13px">Fichiers à télécharger :</p>
          <ul style="margin:0;padding-left:20px">${filesHtml}</ul>
        </div>` : ''}
        <a href="${siteUrl}/compte" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">
          Accéder à mon espace client
        </a>
        <p style="color:#ef4444;font-size:13px;margin-top:16px">⚠️ Passé le ${deadline}, vos fichiers seront définitivement supprimés et ne pourront pas être récupérés.</p>
        <hr />
        <p style="color:#64748b;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique<br/>+32 4 233 01 38 · info@comink.be</p>
      </div>
    `,
  })
}

export async function sendOrderStatusUpdate(to: string, orderNumber: string, status: string) {
  const statusLabels: Record<string, string> = {
    confirmed: 'confirmée',
    in_production: 'en production',
    ready: 'prête pour enlèvement/expédition',
    shipped: 'expédiée',
    delivered: 'livrée',
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Comink — Commande #${orderNumber} : ${statusLabels[status] || status}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="48" alt="Comink" />
        <h1>Mise à jour de votre commande</h1>
        <p>Votre commande <strong>#${orderNumber}</strong> est maintenant <strong>${statusLabels[status] || status}</strong>.</p>
        <hr />
        <p style="color:#64748b;font-size:12px">Comink — +32 4 233 01 38 · info@comink.be</p>
      </div>
    `,
  })
}

export async function sendClientInvite(
  to: string,
  clientName: string,
  inviteUrl: string,
  vendeurName?: string,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Comink — Votre accès client est prêt 🎉',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">

  <div style="background:#1e293b;padding:28px 32px;text-align:center">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="40" alt="Comink" style="filter:brightness(0) invert(1)"/>
  </div>

  <div style="padding:36px 32px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#1e293b">Bienvenue chez Comink, ${clientName} 👋</h1>
    <p style="margin:0 0 20px;color:#475569;line-height:1.6">
      ${vendeurName ? `<strong>${vendeurName}</strong> vous a créé un accès client sur notre plateforme.` : 'Un accès client vient d\'être créé pour vous sur notre plateforme.'}
      Vous pourrez y consulter vos devis, suivre vos commandes et télécharger vos fichiers.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin:24px 0">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em">Première connexion</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px">Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Créer mon mot de passe →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">
      Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
    </p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">
      Comink — Rue de Bruxelles 174h, 4340 Awans<br/>
      +32 4 233 01 38 · info@comink.be
    </p>
  </div>
</div>
</body>
</html>`,
  })
}
