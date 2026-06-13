import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'

/**
 * GET /api/account/team
 * Retourne les membres + invitations en attente du client_account de l'utilisateur
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const service = await createServiceClient()

    // Récupérer l'account_id du profil
    const { data: profile } = await service
      .from('profiles')
      .select('client_account_id, full_name, company')
      .eq('id', user.id)
      .single()

    if (!profile?.client_account_id) {
      return NextResponse.json({ members: [], pending: [], account: null })
    }

    const accountId = profile.client_account_id

    // Vérifier que l'utilisateur est bien membre
    let { data: membership } = await service
      .from('client_account_members')
      .select('role')
      .eq('client_account_id', accountId)
      .eq('profile_id', user.id)
      .single()

    // Auto-réparation : l'utilisateur a un compte mais pas encore d'entrée membre
    // (peut arriver pour les comptes créés avant la migration 033)
    if (!membership) {
      const { data: created } = await service
        .from('client_account_members')
        .upsert(
          { client_account_id: accountId, profile_id: user.id, role: 'owner' },
          { onConflict: 'client_account_id,profile_id' }
        )
        .select('role')
        .single()
      membership = created ?? { role: 'owner' as const }
    }

    // Membres actifs
    const { data: members } = await service
      .from('client_account_members')
      .select(`
        id,
        role,
        created_at,
        profile:profiles(id, full_name, email, company)
      `)
      .eq('client_account_id', accountId)
      .order('created_at', { ascending: true })

    // Invitations en attente
    const { data: pending } = await service
      .from('pending_invitations')
      .select('id, email, role, created_at')
      .eq('client_account_id', accountId)
      .order('created_at', { ascending: false })

    // Infos du compte
    const { data: account } = await service
      .from('client_accounts')
      .select('id, name, email')
      .eq('id', accountId)
      .single()

    return NextResponse.json({
      members: members ?? [],
      pending: pending ?? [],
      account,
      myRole: membership.role,
    })
  } catch (err) {
    console.error('[account/team GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/account/team
 * Invite un nouvel utilisateur dans le compte (owner uniquement)
 * Body: { email: string, role: 'owner' | 'member' }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { email, role = 'member' } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    if (!['owner', 'member'].includes(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })

    const service = await createServiceClient()
    const adminClient = createAdminClient()

    // Vérifier que l'invitant est owner
    const { data: profile } = await service
      .from('profiles')
      .select('client_account_id, full_name, company')
      .eq('id', user.id)
      .single()

    if (!profile?.client_account_id) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const accountId = profile.client_account_id

    const { data: membership } = await service
      .from('client_account_members')
      .select('role')
      .eq('client_account_id', accountId)
      .eq('profile_id', user.id)
      .single()

    if (membership?.role !== 'owner') {
      return NextResponse.json({ error: 'Seul un administrateur peut inviter' }, { status: 403 })
    }

    // Info du compte
    const { data: account } = await service
      .from('client_accounts')
      .select('name')
      .eq('id', accountId)
      .single()

    const accountName = account?.name || profile.company || 'votre équipe'
    const inviterName = profile.full_name || user.email

    // Vérifier si l'utilisateur existe déjà
    const { data: existingProfile } = await service
      .from('profiles')
      .select('id, full_name')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    if (existingProfile) {
      // Utilisateur existant → ajouter directement comme membre
      const { error: memberError } = await service
        .from('client_account_members')
        .upsert(
          { client_account_id: accountId, profile_id: existingProfile.id, role, invited_by: user.id },
          { onConflict: 'client_account_id,profile_id' }
        )

      if (memberError) throw memberError

      // Mettre à jour le client_account_id du profil existant
      await service
        .from('profiles')
        .update({ client_account_id: accountId })
        .eq('id', existingProfile.id)

      // Email de notification
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
      const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.be'
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `${inviterName} vous a ajouté à l'équipe ${accountName}`,
        html: `<p>Bonjour,</p>
<p><strong>${inviterName}</strong> vous a ajouté comme <strong>${role === 'owner' ? 'administrateur' : 'utilisateur'}</strong> du compte <strong>${accountName}</strong> sur Comink.</p>
<p><a href="${siteUrl}/compte?tab=equipe">Accéder à mon compte →</a></p>`,
      }).catch(() => {})

      return NextResponse.json({ success: true, type: 'added' })
    }

    // Utilisateur inexistant → invitation par email Supabase
    // Stocker l'invitation en attente
    await service
      .from('pending_invitations')
      .upsert(
        { email, client_account_id: accountId, role, invited_by: user.id },
        { onConflict: 'email,client_account_id' }
      )

    // Envoyer l'invitation via Supabase Auth (magic link avec metadata)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        invitation_account_id: accountId,
        invitation_role: role,
        invited_by_name: inviterName,
        account_name: accountName,
      },
      redirectTo: `${siteUrl}/auth/callback?next=/compte?tab=equipe`,
    })

    if (inviteError) {
      // Si l'email est déjà connu d'Auth mais pas dans profiles (edge case)
      console.error('[account/team invite]', inviteError)
      // On garde quand même l'invitation en attente + on envoie un email custom
      const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@comink.be'
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `Invitation à rejoindre ${accountName} sur Comink`,
        html: `<p>Bonjour,</p>
<p><strong>${inviterName}</strong> vous invite à rejoindre le compte <strong>${accountName}</strong> sur Comink.</p>
<p>Créez votre compte sur <a href="${siteUrl}/auth/login">${siteUrl}/auth/login</a> avec cette adresse email pour rejoindre l'équipe automatiquement.</p>`,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, type: 'invited' })
  } catch (err: any) {
    console.error('[account/team POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
