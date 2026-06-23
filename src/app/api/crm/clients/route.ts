import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createAdminClient } from '@/lib/supabase/server'
import { sendClientInvite } from '@/lib/resend/client'

// ── GET /api/crm/clients?search=xxx — search existing clients ─────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const search   = new URL(req.url).searchParams.get('search') ?? ''

    if (search.length < 2) return NextResponse.json([])

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, company, phone, vat_number, billing_line1, billing_line2, billing_city, billing_postal_code, billing_country, role, client_account_id, client_account:client_account_id(free_shipping)')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
      .in('role', ['user', 'admin', 'collaborateur', 'vendeur'])  // exclude producteur
      .order('full_name')
      .limit(10)

    if (error) throw error
    const flat = (data ?? []).map((p: any) => ({
      ...p,
      free_shipping: p.client_account?.free_shipping ?? false,
      client_account: undefined,
    }))
    return NextResponse.json(flat)
  } catch (err) {
    console.error('[crm/clients GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST /api/crm/clients — create new client + send invite ───────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      full_name, email, company, phone, vat_number,
      invited_by_name,  // name of the vendeur for the email
      assigned_staff,   // UUID of the vendeur who creates this client
    } = await req.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
    }

    const admin    = createAdminClient()
    const supabase = await createServiceClient()
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

    // ── Check if the email already exists ─────────────────────────────────────
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, full_name, email, company, phone, vat_number')
      .ilike('email', email)
      .limit(1)
      .single()

    if (existing) {
      // Client already exists — just update name/company/phone/vat if provided
      await supabase.from('profiles').update({
        full_name:  full_name  || existing.full_name,
        company:    company    ?? existing.company,
        phone:      phone      ?? existing.phone,
        vat_number: vat_number ?? existing.vat_number,
      }).eq('id', existing.id)

      const updated = { ...existing, full_name, company, phone, vat_number }
      return NextResponse.json({ ...updated, already_exists: true })
    }

    // ── Generate invite link via Supabase Auth ─────────────────────────────────
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name, company: company || null },
        redirectTo: `${siteUrl}/compte`,
      },
    })

    if (linkError || !linkData?.user) {
      console.error('[crm/clients] generateLink error:', linkError)
      throw new Error(linkError?.message || 'Impossible de créer le compte')
    }

    const userId     = linkData.user.id
    const inviteUrl  = linkData.properties.action_link

    // ── Update the auto-created profile with company, phone, vat, staff ───────
    // (the trigger already created it with id + email + full_name)
    await supabase.from('profiles').update({
      company:        company        || null,
      phone:          phone          || null,
      vat_number:     vat_number     || null,
      assigned_staff: assigned_staff || null,
    }).eq('id', userId)

    // ── Send branded invite email via Resend ────────────────────────────────────
    await sendClientInvite(email, full_name, inviteUrl, invited_by_name)

    const profile = { id: userId, full_name, email, company, phone, vat_number, already_exists: false }
    return NextResponse.json(profile, { status: 201 })
  } catch (err: any) {
    console.error('[crm/clients POST]', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
