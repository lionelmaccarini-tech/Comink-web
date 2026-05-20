import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateQuoteNumber } from '@/lib/utils'

const CRM_ROLES = ['admin', 'collaborateur', 'vendeur']

async function checkAccess(supabase: any) {
  // Get session from service client (already authenticated via cookie)
  const { data: { user } } = await (await import('@/lib/supabase/server')).createClient().then(c => c.auth.getUser().then(r => r))
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name').eq('id', user.id).single()
  if (!profile || !CRM_ROLES.includes(profile.role)) return null
  return profile
}

// ── GET /api/crm/quotes — list quotes ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(req.url)
    const stage   = searchParams.get('stage')
    const assigned = searchParams.get('assigned_to')
    const search  = searchParams.get('search')
    const limit   = parseInt(searchParams.get('limit') || '100', 10)

    let query = supabase
      .from('quotes')
      .select(`
        id, quote_number, client_name, client_email, client_company, client_phone,
        items, subtotal, tax, total, status, pipeline_stage, assigned_to,
        probability, expected_amount, next_action_date, next_action_note,
        source, lost_reason, valid_until, notes, reference, vat_number,
        created_by, created_at, updated_at,
        assignee:profiles!quotes_assigned_to_fkey(id, full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (stage)    query = query.eq('pipeline_stage', stage)
    if (assigned) query = query.eq('assigned_to', assigned)
    if (search)   query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_company.ilike.%${search}%,quote_number.ilike.%${search}%`)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[crm/quotes GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST /api/crm/quotes — create quote ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const body = await req.json()

    const {
      client_name, client_email, client_company, client_phone,
      user_id,
      items = [], subtotal = 0, tax = 0, total = 0,
      pipeline_stage = 'lead', assigned_to, probability = 20,
      expected_amount, next_action_date, next_action_note,
      source = 'web', notes, reference, vat_number, valid_until,
      created_by,
      delivery_method = 'pickup', delivery_cost = 0,
      delivery_country = 'BE', delivery_address, delivery_km,
      blind_shipping = false,
    } = body

    if (!client_name || !client_email) {
      return NextResponse.json({ error: 'client_name et client_email requis' }, { status: 400 })
    }

    const quote_number = generateQuoteNumber()
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_number,
        client_name, client_email, client_company, client_phone,
        user_id: user_id || null,
        items, subtotal, tax, total,
        status: 'draft',
        pipeline_stage,
        assigned_to: assigned_to || null,
        probability,
        expected_amount: expected_amount ?? total,
        next_action_date: next_action_date || null,
        next_action_note: next_action_note || null,
        source,
        notes: notes || null,
        reference: reference || null,
        vat_number: vat_number || null,
        valid_until: valid_until || null,
        created_by: created_by || null,
        delivery_method,
        delivery_cost,
        delivery_country,
        delivery_address: delivery_address || null,
        delivery_km: delivery_km ?? null,
        blind_shipping,
      })
      .select()
      .single()

    if (error) throw error

    // Log creation activity
    await supabase.from('crm_activities').insert({
      quote_id:   data.id,
      type:       'status_change',
      content:    `Devis créé`,
      new_stage:  pipeline_stage,
      created_by: created_by || null,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[crm/quotes POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
