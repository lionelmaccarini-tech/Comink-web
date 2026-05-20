import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const { status_id, assignee_id, due_date, notes } = body

    const patch: Record<string, unknown> = {}
    if (status_id !== undefined) patch.status_id = status_id
    if (assignee_id !== undefined) patch.assignee_id = assignee_id
    if (due_date !== undefined) patch.due_date = due_date
    if (notes !== undefined) patch.notes = notes

    const { data, error } = await supabase
      .from('production_lines')
      .update(patch)
      .eq('id', id)
      .select('*, status:production_statuses(*)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[production/lines PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
