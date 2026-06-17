import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/client'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.eu'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.eu'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  collaborateur: 'Collaborateur',
  vendeur: 'Vendeur',
  producteur: 'Producteur',
}

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, company, phone')
    .in('role', ['admin', 'collaborateur', 'vendeur', 'producteur'])
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — two actions:
//   { action: 'create', full_name, email, role } → create new account + send invite
//   { email, role } → assign role to existing account
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createServiceClient()

  if (body.action === 'create') {
    try {
      const { full_name, email, role } = body
      if (!full_name || !email || !role) {
        return NextResponse.json({ error: 'Nom, email et rôle requis' }, { status: 400 })
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .ilike('email', email)
        .maybeSingle()

      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ role, full_name: full_name || existing.full_name })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ...data, already_exists: true })
      }

      // Create new user via Supabase Auth invite
      const admin = createAdminClient()
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: { full_name },
          redirectTo: `${SITE_URL}/compte`,
        },
      })

      if (linkError || !linkData?.user) {
        return NextResponse.json({ error: linkError?.message || 'Impossible de créer le compte' }, { status: 500 })
      }

      // Set role on the auto-created profile
      await supabase.from('profiles').update({ role, full_name }).eq('id', linkData.user.id)

      // Send invite email (non-blocking — don't fail if email fails)
      const inviteUrl = linkData.properties.action_link
      const roleLabel = ROLE_LABELS[role] || role
      let emailSent = false
      try {
        await sendEmail({
          from: FROM,
          to: email,
          subject: `Comink — Votre accès ${roleLabel} est prêt`,
          html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#1e293b;padding:28px 32px;text-align:center">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="40" alt="Comink" style="filter:brightness(0) invert(1)"/>
  </div>
  <div style="padding:36px 32px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#1e293b">Bienvenue dans l'équipe, ${full_name} 👋</h1>
    <p style="margin:0 0 20px;color:#475569;line-height:1.6">
      Un compte <strong>${roleLabel}</strong> a été créé pour vous sur la plateforme Comink.
      Cliquez ci-dessous pour définir votre mot de passe et accéder au backoffice.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin:24px 0">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em">Première connexion</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Créer mon mot de passe →
      </a>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">Ce lien est valable 24 heures.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans<br/>+32 4 233 01 38 · info@comink.be</p>
  </div>
</div>
</body>
</html>`,
        })
        emailSent = true
      } catch (emailErr) {
        console.error('[collaborateurs] email send failed (non-blocking):', emailErr)
      }

      return NextResponse.json({ id: linkData.user.id, email, full_name, role, already_exists: false, invite_url: inviteUrl, email_sent: emailSent }, { status: 201 })
    } catch (err: any) {
      console.error('[collaborateurs POST create]', err)
      return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
    }
  }

  // Legacy: assign role to existing user by email
  const { email, role } = body
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', email)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Aucun utilisateur trouvé avec cet email. La personne doit d\'abord créer un compte.' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServiceClient()
  const { id, role } = await req.json()

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
