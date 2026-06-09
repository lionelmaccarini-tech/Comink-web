import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// PATCH /api/admin/angelo-knowledge/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = await createServiceClient()
    const allowed = ['category', 'question', 'answer', 'keywords', 'source', 'source_ref', 'is_active', 'approved']
    const update: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in body) update[k] = body[k]
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('angelo_knowledge')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/angelo-knowledge PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/admin/angelo-knowledge/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { error } = await supabase.from('angelo_knowledge').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/angelo-knowledge DELETE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
