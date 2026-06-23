import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/account/billing
 * Retourne tous les client_accounts auxquels l'utilisateur appartient,
 * avec son rôle pour chacun.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // 1) Récupérer les appartenances de l'utilisateur
  const { data: memberships, error: memberErr } = await admin
    .from('client_account_members')
    .select('id, role, client_account_id')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
  if (!memberships || memberships.length === 0) return NextResponse.json([])

  const accountIds = memberships.map((m: any) => m.client_account_id)

  // 2) Récupérer les données des comptes
  const { data: accounts, error: accErr } = await admin
    .from('client_accounts')
    .select('id, name, email, phone, vat_number, address_line1, address_line2, city, postal_code, country')
    .in('id', accountIds)

  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })

  // Récupérer le compte actif du profil
  const { data: profile } = await admin
    .from('profiles')
    .select('client_account_id')
    .eq('id', user.id)
    .single()

  const activeAccountId = profile?.client_account_id

  // Fusionner avec le rôle et le statut actif
  const result = (accounts ?? []).map((acc: any) => {
    const membership = memberships.find((m: any) => m.client_account_id === acc.id)
    return {
      ...acc,
      membership_id: membership?.id,
      role: membership?.role ?? 'member',
      is_active: acc.id === activeAccountId,
    }
  })

  // Trier : actif en premier
  result.sort((a: any, b: any) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))

  return NextResponse.json(result)
}

/**
 * POST /api/account/billing
 * Crée un nouveau client_account et lie l'utilisateur comme owner.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { name, vat_number, email, phone, address_line1, address_line2, city, postal_code, country } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'La raison sociale est obligatoire.' }, { status: 400 })

  // Vérifier l'unicité par nom OU numéro de TVA
  const orConditions = [`name.ilike.${name.trim()}`]
  if (vat_number?.trim()) orConditions.push(`vat_number.ilike.${vat_number.trim()}`)

  const { data: existing } = await admin
    .from('client_accounts')
    .select('id, name, vat_number')
    .or(orConditions.join(','))
    .limit(1)

  if (existing && existing.length > 0) {
    const dup = existing[0]
    const reason = dup.name?.toLowerCase() === name.trim().toLowerCase()
      ? `Un compte avec la raison sociale "${dup.name}" existe déjà.`
      : `Le numéro de TVA "${dup.vat_number}" est déjà enregistré sur un autre compte.`
    return NextResponse.json({ error: reason }, { status: 409 })
  }

  // Créer le compte
  const { data: account, error: createErr } = await admin
    .from('client_accounts')
    .insert({
      name: name.trim(),
      vat_number: vat_number?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address_line1: address_line1?.trim() || null,
      address_line2: address_line2?.trim() || null,
      city: city?.trim() || null,
      postal_code: postal_code?.trim() || null,
      country: country || 'BE',
      is_active: true,
    })
    .select('id, name')
    .single()

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

  // Lier l'utilisateur comme owner
  await admin.from('client_account_members').insert({
    client_account_id: account.id,
    profile_id: user.id,
    role: 'owner',
  })

  // Si l'utilisateur n'a pas encore de compte actif, activer celui-ci
  const { data: profile } = await admin.from('profiles').select('client_account_id').eq('id', user.id).single()
  if (!profile?.client_account_id) {
    await admin.from('profiles').update({ client_account_id: account.id }).eq('id', user.id)
  }

  return NextResponse.json(account, { status: 201 })
}
