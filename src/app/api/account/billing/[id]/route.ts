import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * PUT /api/account/billing/[id]
 * Met à jour les coordonnées de facturation d'un client_account.
 * Seul un owner du compte peut modifier.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Vérifier que l'utilisateur est owner de ce compte
  const { data: membership } = await admin
    .from('client_account_members')
    .select('role')
    .eq('client_account_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  if (membership.role !== 'owner') return NextResponse.json({ error: 'Seuls les administrateurs peuvent modifier les coordonnées de facturation.' }, { status: 403 })

  const body = await req.json()
  const { name, vat_number, email, phone, address_line1, address_line2, city, postal_code, country } = body

  // Vérifier l'unicité : pas d'autre compte avec le même name ou vat_number
  if (name || vat_number) {
    const orConditions = []
    if (name?.trim()) orConditions.push(`name.ilike.${name.trim()}`)
    if (vat_number?.trim()) orConditions.push(`vat_number.ilike.${vat_number.trim()}`)

    if (orConditions.length > 0) {
      const { data: existing } = await admin
        .from('client_accounts')
        .select('id, name, vat_number')
        .or(orConditions.join(','))
        .neq('id', id)

      if (existing && existing.length > 0) {
        const dup = existing[0]
        const reason = dup.name?.toLowerCase() === name?.trim().toLowerCase()
          ? `La raison sociale "${dup.name}" est déjà utilisée par un autre compte.`
          : `Le numéro de TVA "${dup.vat_number}" est déjà enregistré sur un autre compte.`
        return NextResponse.json({ error: reason }, { status: 409 })
      }
    }
  }

  const { data, error } = await admin
    .from('client_accounts')
    .update({
      name:          name          || null,
      vat_number:    vat_number    || null,
      email:         email         || null,
      phone:         phone         || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city:          city          || null,
      postal_code:   postal_code   || null,
      country:       country       || 'BE',
      updated_at:    new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, email, phone, vat_number, address_line1, address_line2, city, postal_code, country')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
