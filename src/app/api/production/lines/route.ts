import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status_id = searchParams.get('status_id')
    const assignee_id = searchParams.get('assignee_id')
    const search = searchParams.get('search')
    const mode = searchParams.get('mode') // 'sous-traitance' | null (= production)

    let query = supabase
      .from('production_lines')
      .select('*, status:production_statuses(*)')
      .eq('is_subcontracted', mode === 'sous-traitance')
      .order('created_at', { ascending: false })

    if (status_id) query = query.eq('status_id', status_id)
    if (assignee_id) query = query.eq('assignee_id', assignee_id)
    if (search) {
      query = query.or(
        `product_name.ilike.%${search}%,order_number.ilike.%${search}%,client_name.ilike.%${search}%,client_email.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[production/lines GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, profile } = await requireStaff()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (!['admin', 'collaborateur'].includes(profile.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { data, error } = await supabase
      .from('production_lines')
      .insert(body)
      .select('*, status:production_statuses(*)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[production/lines POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
