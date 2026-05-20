import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ── GET /api/crm/quotes/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        assignee:profiles!quotes_assigned_to_fkey(id, full_name, role)
      `)
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT /api/crm/quotes/[id] — update quote ───────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const body = await req.json()

    // Detect stage change for activity log
    const { data: current } = await supabase.from('quotes').select('pipeline_stage').eq('id', id).single()
    const stageChanged = current && body.pipeline_stage && current.pipeline_stage !== body.pipeline_stage

    // Whitelist updatable fields to avoid unknown-column errors
    const {
      client_name, client_email, client_company, client_phone, user_id,
      items, subtotal, tax, total, reference, vat_number,
      pipeline_stage, assigned_to, probability, expected_amount,
      next_action_date, next_action_note, source, lost_reason,
      valid_until, notes, status,
      delivery_method, delivery_cost, delivery_country, delivery_address, delivery_km, blind_shipping,
    } = body

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const set = (k: string, v: unknown) => { if (v !== undefined) patch[k] = v }

    set('client_name', client_name)
    set('client_email', client_email)
    set('client_company', client_company ?? null)
    set('client_phone', client_phone ?? null)
    set('user_id', user_id ?? null)
    set('items', items)
    set('subtotal', subtotal)
    set('tax', tax)
    set('total', total)
    set('reference', reference ?? null)
    set('vat_number', vat_number ?? null)
    set('pipeline_stage', pipeline_stage)
    set('assigned_to', assigned_to ?? null)
    set('probability', probability)
    set('expected_amount', expected_amount)
    set('next_action_date', next_action_date ?? null)
    set('next_action_note', next_action_note ?? null)
    set('source', source)
    set('lost_reason', lost_reason ?? null)
    set('valid_until', valid_until ?? null)
    set('notes', notes ?? null)
    set('status', status)
    set('delivery_method', delivery_method)
    set('delivery_cost', delivery_cost)
    set('delivery_country', delivery_country)
    set('delivery_address', delivery_address ?? null)
    set('delivery_km', delivery_km ?? null)
    set('blind_shipping', blind_shipping)

    const { data, error } = await supabase
      .from('quotes')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log stage change
    if (stageChanged) {
      await supabase.from('crm_activities').insert({
        quote_id:   id,
        type:       'status_change',
        content:    `Stade changé : ${current.pipeline_stage} → ${body.pipeline_stage}`,
        old_stage:  current.pipeline_stage,
        new_stage:  body.pipeline_stage,
        created_by: body._updated_by || null,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[crm/quotes PUT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE /api/crm/quotes/[id] ───────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
