import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const order_id = searchParams.get('order_id')

    let query = supabase
      .from('production_lines')
      .select('*, status:production_statuses(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (order_id) query = query.eq('order_id', order_id)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[production/lines/client GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
