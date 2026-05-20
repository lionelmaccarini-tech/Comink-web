import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/crm/activities?quote_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const quoteId = new URL(req.url).searchParams.get('quote_id')
    if (!quoteId) return NextResponse.json({ error: 'quote_id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('crm_activities')
      .select('*, author:profiles!crm_activities_created_by_fkey(id, full_name)')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/crm/activities — add note / call / meeting
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { quote_id, type, content, created_by } = await req.json()

    if (!quote_id || !type) {
      return NextResponse.json({ error: 'quote_id et type requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('crm_activities')
      .insert({ quote_id, type, content, created_by: created_by || null })
      .select('*, author:profiles!crm_activities_created_by_fkey(id, full_name)')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[crm/activities POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
