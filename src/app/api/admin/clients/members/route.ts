import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/client'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.eu'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.eu'
const ADMIN_EMAIL = process.env.ADMIN_FALLBACK_EMAIL || 'lionelmaccarini@gmail.com'

async function generateAccessLink(email: string, fullName: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: inviteData, error: inviteError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName }, redirectTo: `${SITE_URL}/auth/reset-password` },
  })
  if (!inviteError && inviteData?.properties?.action_link) return inviteData.properties.action_link

  const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/auth/reset-password` },
  })
  if (!recoveryError && recoveryData?.properties?.action_link) return recoveryData.properties.action_link

  console.error('[members generateAccessLink] invite:', inviteError, 'recovery:', recoveryError)
  return null
}

// Find or create profile, then add to client account
async function ensureProfileAndAddMember(supabase: any, admin: any, clientAccountId: string, email: string, fullName: string, role: string) {
  const emailLow = email.trim().toLowerCase()
  console.log('[ensureProfileAndAddMember] start', { email: emailLow, clientAccountId, role })

  // Find profile in profiles table
  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', emailLow)
    .maybeSingle()

  console.log('[ensureProfileAndAddMember] profile lookup:', { found: !!profile, error: profileErr?.message })

  if (!profile) {
    // Find in auth users
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    console.log('[ensureProfileAndAddMember] listUsers:', { count: users?.length, error: listErr?.message })
    const authUser = users?.find((u: any) => u.email?.toLowerCase() === emailLow)
    console.log('[ensureProfileAndAddMember] authUser found:', !!authUser, authUser?.id)
    if (authUser) {
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        { id: authUser.id, email: emailLow, full_name: fullName || emailLow },
        { onConflict: 'id' }
      )
      console.log('[ensureProfileAndAddMember] profile upsert error:', upsertErr?.message)
      profile = { id: authUser.id, email: emailLow, full_name: fullName }
    }
  }

  if (!profile) {
    console.error('[ensureProfileAndAddMember] no profile found, cannot add member')
    return null
  }

  // Add to client_account_members
  const { data: member, error: memberErr } = await supabase
    .from('client_account_members')
    .upsert({ client_account_id: clientAccountId, profile_id: profile.id, role }, { onConflict: 'client_account_id,profile_id' })
    .select(`*, profile:profiles!client_account_members_profile_id_fkey(id, email, full_name, phone)`)
    .single()

  console.log('[ensureProfileAndAddMember] member upsert:', { ok: !memberErr, error: memberErr?.message, memberId: member?.id })

  if (memberErr) return null

  await supabase.from('profiles').update({ client_account_id: clientAccountId }).eq('id', profile.id)
  return member
}

// GET — list members for a client account
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const clientAccountId = searchParams.get('client_account_id')
  if (!clientAccountId) return NextResponse.json({ error: 'client_account_id requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('client_account_members')
    .select(`*, profile:profiles!client_account_members_profile_id_fkey(id, email, full_name, phone)`)
    .eq('client_account_id', clientAccountId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

function buildInviteEmail(nameOrEmail: string, email: string, inviteUrl: string, clientName?: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#1e293b;padding:28px 32px;text-align:center">
    <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" height="40" alt="Comink" style="filter:brightness(0) invert(1)"/>
  </div>
  <div style="padding:36px 32px">
    <h1 style="margin:0 0 12px;font-size:22px;color:#1e293b">Bienvenue sur Comink, ${nameOrEmail} 👋</h1>
    <p style="margin:0 0 20px;color:#475569;line-height:1.6">
      Un accès client${clientName ? ` pour le compte <strong>${clientName}</strong>` : ''} a été créé pour vous sur la plateforme Comink.
      Vous pourrez suivre vos commandes, consulter vos devis et gérer votre compte.
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
</body></html>`
}

// POST — actions:
//   { action: 'invite', client_account_id, client_name, email, full_name, role }
//   { action: 'bulk_invite_owners' } → invite billing email as owner for every client with no members
//   { client_account_id, email, role } → legacy: add existing user
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  // ── Bulk: create owner for every client without members ───────────────────
  if (body.action === 'bulk_invite_owners') {
    const admin = createAdminClient()

    // Find all client accounts that have no members yet
    const { data: clients, error: clientErr } = await supabase
      .from('client_accounts')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name')

    if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 })

    // Get client IDs that already have at least one member
    const { data: existing } = await supabase
      .from('client_account_members')
      .select('client_account_id')

    const withMembers = new Set((existing ?? []).map((m: any) => m.client_account_id))
    const targets = (clients ?? []).filter((c: any) => !withMembers.has(c.id))

    const results: { client: string; email: string; ok: boolean; error?: string }[] = []

    for (const c of targets) {
      if (!c.email) {
        results.push({ client: c.name, email: '', ok: false, error: 'Pas d\'email de facturation' })
        continue
      }
      try {
        const inviteUrl = await generateAccessLink(c.email, c.name)
        if (!inviteUrl) throw new Error('Lien non généré')

        await ensureProfileAndAddMember(supabase, admin, c.id, c.email, c.name, 'owner')

        // Send email
        const emailSubject = `Comink — Votre accès client (${c.name}) est prêt`
        const emailBody = buildInviteEmail(c.name, c.email, inviteUrl)
        let emailSent = false
        try {
          await sendEmail({ from: FROM, to: c.email, subject: emailSubject, html: emailBody })
          emailSent = true
        } catch {
          try {
            await sendEmail({ from: FROM, to: ADMIN_EMAIL, subject: `[À transférer à ${c.email}] ${emailSubject}`, html: `<p>Lien : <a href="${inviteUrl}">${inviteUrl}</a></p>${emailBody}` })
          } catch {}
        }
        results.push({ client: c.name, email: c.email, ok: true })
      } catch (e: any) {
        results.push({ client: c.name, email: c.email, ok: false, error: e.message })
      }
    }

    return NextResponse.json({ processed: targets.length, results })
  }

  if (body.action === 'invite') {
    try {
      const { client_account_id, client_name, email, full_name, role = 'member' } = body
      if (!client_account_id || !email) return NextResponse.json({ error: 'client_account_id et email requis' }, { status: 400 })

      const admin = createAdminClient()

      // Generate access link FIRST — this creates the auth user if they don't exist yet
      const inviteUrl = await generateAccessLink(email, full_name || email)
      if (!inviteUrl) return NextResponse.json({ error: 'Impossible de générer le lien d\'accès' }, { status: 500 })

      // Now the auth user exists → find/create profile and add to client account
      await ensureProfileAndAddMember(supabase, admin, client_account_id, email, full_name || email, role)

      // Send email
      let emailSent = false
      const emailSubject = `Comink — Votre accès client ${client_name ? `(${client_name}) ` : ''}est prêt`
      const emailBody = buildInviteEmail(full_name || email, email, inviteUrl, client_name)
      try {
        await sendEmail({ from: FROM, to: email, subject: emailSubject, html: emailBody })
        emailSent = true
      } catch (emailErr) {
        console.error('[members invite] email failed, trying admin fallback:', emailErr)
        try {
          await sendEmail({
            from: FROM, to: ADMIN_EMAIL,
            subject: `[À transférer à ${email}] ${emailSubject}`,
            html: `<p>L'email n'a pas pu être envoyé directement à <strong>${email}</strong>.</p>
<p>Transfère ce lien manuellement :</p>
<p><a href="${inviteUrl}" style="color:#2563eb;font-weight:bold">${inviteUrl}</a></p>
<hr/>${emailBody}`,
          })
        } catch (fallbackErr) {
          console.error('[members invite] admin fallback failed:', fallbackErr)
        }
      }

      // Reload member data to return
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
      const memberData = profile
        ? await supabase.from('client_account_members')
            .select(`*, profile:profiles!client_account_members_profile_id_fkey(id, email, full_name, phone)`)
            .eq('client_account_id', client_account_id)
            .eq('profile_id', profile.id)
            .maybeSingle()
            .then((r: any) => r.data)
        : null

      return NextResponse.json({ member: memberData, invite_url: inviteUrl, email_sent: emailSent })
    } catch (err: any) {
      console.error('[members POST invite]', err)
      return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
    }
  }

  // Legacy: add existing user by email
  const { client_account_id, email, role = 'member' } = body
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Aucun utilisateur avec cet email. Utilisez "Inviter" pour créer un accès.' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('client_account_members')
    .upsert({ client_account_id, profile_id: profile.id, role }, { onConflict: 'client_account_id,profile_id' })
    .select(`*, profile:profiles!client_account_members_profile_id_fkey(id, email, full_name, phone)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('profiles').update({ client_account_id }).eq('id', profile.id)
  return NextResponse.json(data)
}

// Remove member
export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const profile_id = searchParams.get('profile_id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('client_account_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (profile_id) {
    const { data: remaining } = await supabase.from('client_account_members').select('id').eq('profile_id', profile_id)
    if (!remaining?.length) {
      await supabase.from('profiles').update({ client_account_id: null }).eq('id', profile_id)
    }
  }

  return NextResponse.json({ success: true })
}

// Update member role
export async function PUT(req: NextRequest) {
  const supabase = createAdminClient()
  const { id, role } = await req.json()
  const { data, error } = await supabase
    .from('client_account_members')
    .update({ role })
    .eq('id', id)
    .select(`*, profile:profiles(id, email, full_name)`)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
