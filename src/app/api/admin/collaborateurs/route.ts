import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/client'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.eu'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.eu'
const ADMIN_EMAIL = process.env.ADMIN_FALLBACK_EMAIL || 'lionelmaccarini@gmail.com'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  collaborateur: 'Collaborateur',
  vendeur: 'Vendeur',
  producteur: 'Producteur',
}

function inviteEmailHtml(fullName: string, roleLabel: string, link: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#1e293b;padding:28px 32px;text-align:center">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="40" alt="Comink" style="filter:brightness(0) invert(1)"/>
  </div>
  <div style="padding:36px 32px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#1e293b">Bienvenue dans l'équipe, ${fullName} 👋</h1>
    <p style="margin:0 0 20px;color:#475569;line-height:1.6">
      Un compte <strong>${roleLabel}</strong> a été créé pour vous sur la plateforme Comink.
      Cliquez ci-dessous pour définir votre mot de passe et accéder au backoffice.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin:24px 0">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em">Créer mon accès</p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Définir mon mot de passe →
      </a>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">Ce lien est valable 24 heures.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">Comink — Rue de Bruxelles 174h, 4340 Awans<br/>+32 4 233 01 38 · info@comink.be</p>
  </div>
</div>
</body></html>`
}

// Generate an access link: try invite first, fall back to recovery for confirmed users
async function generateAccessLink(email: string, fullName: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: inviteData, error: inviteError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName }, redirectTo: `${SITE_URL}/auth/reset-password` },
  })
  if (!inviteError && inviteData?.properties?.action_link) {
    return inviteData.properties.action_link
  }

  // Fallback: recovery link (works for already-confirmed users)
  const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/auth/reset-password` },
  })
  if (!recoveryError && recoveryData?.properties?.action_link) {
    return recoveryData.properties.action_link
  }

  console.error('[generateAccessLink] invite error:', inviteError, 'recovery error:', recoveryError)
  return null
}

// Find or create a profile for an auth user
async function ensureProfile(supabase: any, admin: any, email: string, fullName: string, role: string) {
  const emailLow = email.toLowerCase()

  // Always resolve via auth admin to get the canonical user ID
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = users?.find((u: any) => u.email?.toLowerCase() === emailLow)

  if (authUser) {
    const { error } = await supabase.from('profiles').upsert(
      { id: authUser.id, email: emailLow, full_name: fullName || authUser.user_metadata?.full_name || emailLow, role },
      { onConflict: 'id' }
    )
    if (error) console.error('[ensureProfile] upsert error:', error)
    return authUser.id
  }

  // Auth user not found yet (just created by generateLink — try profiles table)
  const { data: profile } = await supabase.from('profiles').select('id').ilike('email', emailLow).maybeSingle()
  if (profile) {
    const { error } = await supabase.from('profiles').update({ role, full_name: fullName }).eq('id', profile.id)
    if (error) console.error('[ensureProfile] update error:', error)
    return profile.id
  }

  return null
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at, company, phone')
    .in('role', ['admin', 'collaborateur', 'vendeur', 'producteur'])
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const admin = createAdminClient()

  if (body.action === 'create' || body.action === 'resend_invite') {
    try {
      const { full_name, email, role } = body
      if (!email || !role) return NextResponse.json({ error: 'Email et rôle requis' }, { status: 400 })
      if (body.action === 'create' && !full_name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

      await ensureProfile(admin, admin, email, full_name || email, role)

      const inviteUrl = await generateAccessLink(email, full_name || email)
      if (!inviteUrl) return NextResponse.json({ error: 'Impossible de générer le lien d\'accès' }, { status: 500 })

      const roleLabel = ROLE_LABELS[role] || role
      let emailSent = false
      try {
        await sendEmail({
          from: FROM, to: email,
          subject: `Comink — Votre accès ${roleLabel} est prêt`,
          html: inviteEmailHtml(full_name || email, roleLabel, inviteUrl),
        })
        emailSent = true
      } catch (emailErr) {
        console.error('[collaborateurs] email send failed, trying admin fallback:', emailErr)
        // Fallback: send to admin so they can forward manually
        try {
          await sendEmail({
            from: FROM, to: ADMIN_EMAIL,
            subject: `[À transférer à ${email}] Invitation Comink — ${roleLabel}`,
            html: `<p>L'email n'a pas pu être envoyé directement à <strong>${email}</strong>.</p>
<p>Transfère ce lien manuellement :</p>
<p><a href="${inviteUrl}" style="color:#2563eb;font-weight:bold">${inviteUrl}</a></p>
<hr/>
${inviteEmailHtml(full_name || email, roleLabel, inviteUrl)}`,
          })
        } catch (fallbackErr) {
          console.error('[collaborateurs] admin fallback email failed:', fallbackErr)
        }
      }

      return NextResponse.json({ email, full_name, role, invite_url: inviteUrl, email_sent: emailSent, already_exists: body.action === 'resend_invite' })
    } catch (err: any) {
      console.error('[collaborateurs POST create/resend]', err)
      return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
    }
  }

  // Legacy: assign role to existing user by email
  try {
    const { email, role } = body
    if (!email || !role) return NextResponse.json({ error: 'Email et rôle requis' }, { status: 400 })

    // Look in profiles first, then auth
    const { data: existing } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (existing) {
      const { data, error } = await admin.from('profiles').update({ role }).eq('id', existing.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    // Not in profiles — look up via auth admin and create profile
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const authUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (!authUser) {
      return NextResponse.json({ error: 'Aucun utilisateur trouvé avec cet email.' }, { status: 404 })
    }
    const { error: upsertError } = await admin.from('profiles').upsert({ id: authUser.id, email, role }, { onConflict: 'id' })
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
    return NextResponse.json({ id: authUser.id, email, role })
  } catch (err: any) {
    console.error('[collaborateurs POST legacy]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const admin = createAdminClient()
  const { id, role } = await req.json()
  const { data, error } = await admin.from('profiles').update({ role }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
