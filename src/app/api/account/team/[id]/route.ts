import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** PATCH /api/account/team/[id] — changer le rôle d'un membre */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { role } = await req.json()
    if (!['owner', 'member'].includes(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })

    const service = await createServiceClient()

    // Récupérer le membership cible
    const { data: target } = await service
      .from('client_account_members')
      .select('client_account_id, profile_id')
      .eq('id', id)
      .single()

    if (!target) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

    // Vérifier que le demandeur est owner du même compte
    const { data: myMembership } = await service
      .from('client_account_members')
      .select('role')
      .eq('client_account_id', target.client_account_id)
      .eq('profile_id', user.id)
      .single()

    if (myMembership?.role !== 'owner') {
      return NextResponse.json({ error: 'Seul un administrateur peut changer les rôles' }, { status: 403 })
    }

    // Empêcher de se déclasser soi-même si on est le seul owner
    if (target.profile_id === user.id && role !== 'owner') {
      const { count } = await service
        .from('client_account_members')
        .select('id', { count: 'exact', head: true })
        .eq('client_account_id', target.client_account_id)
        .eq('role', 'owner')

      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Impossible — vous êtes le seul administrateur' }, { status: 400 })
      }
    }

    const { error } = await service
      .from('client_account_members')
      .update({ role })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/team PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** DELETE /api/account/team/[id] — retirer un membre ou annuler une invitation */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'member' | 'invitation'

    const service = await createServiceClient()

    if (type === 'invitation') {
      // Supprimer une invitation en attente
      const { data: inv } = await service
        .from('pending_invitations')
        .select('client_account_id')
        .eq('id', id)
        .single()

      if (!inv) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })

      // Vérifier owner
      const { data: myMembership } = await service
        .from('client_account_members')
        .select('role')
        .eq('client_account_id', inv.client_account_id)
        .eq('profile_id', user.id)
        .single()

      if (myMembership?.role !== 'owner') {
        return NextResponse.json({ error: 'Seul un administrateur peut annuler une invitation' }, { status: 403 })
      }

      await service.from('pending_invitations').delete().eq('id', id)
      return NextResponse.json({ success: true })
    }

    // Retirer un membre actif
    const { data: target } = await service
      .from('client_account_members')
      .select('client_account_id, profile_id, role')
      .eq('id', id)
      .single()

    if (!target) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

    // Owner peut retirer n'importe qui; un membre peut se retirer lui-même
    const { data: myMembership } = await service
      .from('client_account_members')
      .select('role')
      .eq('client_account_id', target.client_account_id)
      .eq('profile_id', user.id)
      .single()

    const isSelf = target.profile_id === user.id
    if (myMembership?.role !== 'owner' && !isSelf) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Empêcher de retirer le dernier owner
    if (target.role === 'owner') {
      const { count } = await service
        .from('client_account_members')
        .select('id', { count: 'exact', head: true })
        .eq('client_account_id', target.client_account_id)
        .eq('role', 'owner')

      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Impossible — vous êtes le seul administrateur du compte' }, { status: 400 })
      }
    }

    await service.from('client_account_members').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/team DELETE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
