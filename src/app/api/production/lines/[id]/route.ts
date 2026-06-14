import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

/** Calcule le statut de commande à partir des lignes et des statuts de production */
async function syncOrderStatus(supabase: any, orderId: string) {
  // Tous les statuts de production
  const { data: allStatuses } = await supabase
    .from('production_statuses')
    .select('id, name, is_initial, is_final')

  if (!allStatuses) return

  const initialIds = new Set(allStatuses.filter((s: any) => s.is_initial).map((s: any) => s.id))
  const finalIds   = new Set(allStatuses.filter((s: any) => s.is_final).map((s: any) => s.id))

  // Toutes les lignes de la commande
  const { data: lines } = await supabase
    .from('production_lines')
    .select('id, status_id')
    .eq('order_id', orderId)

  if (!lines || lines.length === 0) return

  const allInitial = lines.every((l: any) => initialIds.has(l.status_id))
  const allFinal   = lines.every((l: any) => finalIds.has(l.status_id))

  let newOrderStatus: string
  if (allInitial) {
    newOrderStatus = 'pending'
  } else if (allFinal) {
    // Détecter si "expédié/livré" dans les noms des statuts finaux des lignes
    const lineStatusIds = lines.map((l: any) => l.status_id)
    const lineStatuses  = allStatuses.filter((s: any) => lineStatusIds.includes(s.id))
    const hasShipped    = lineStatuses.some((s: any) => {
      const n = (s.name ?? '').toLowerCase()
      return n.includes('expédi') || n.includes('livr') || n.includes('expedi') || n.includes('ship')
    })
    newOrderStatus = hasShipped ? 'shipped' : 'ready'
  } else {
    newOrderStatus = 'in_production'
  }

  // Ne pas rétrograder une commande déjà livrée/annulée
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (currentOrder?.status === 'delivered' || currentOrder?.status === 'cancelled') return
  if (currentOrder?.status === newOrderStatus) return

  await supabase
    .from('orders')
    .update({ status: newOrderStatus })
    .eq('id', orderId)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const { status_id, assignee_id, due_date, notes } = body

    const patch: Record<string, unknown> = {}
    if (status_id   !== undefined) patch.status_id   = status_id
    if (assignee_id !== undefined) patch.assignee_id = assignee_id
    if (due_date    !== undefined) patch.due_date    = due_date
    if (notes       !== undefined) patch.notes       = notes

    const { data, error } = await supabase
      .from('production_lines')
      .update(patch)
      .eq('id', id)
      .select('*, status:production_statuses(*)')
      .single()

    if (error) throw error

    // Propagation automatique vers la commande si le statut a changé
    if (status_id !== undefined && data?.order_id) {
      try {
        await syncOrderStatus(supabase, data.order_id)
      } catch (cascadeErr) {
        console.warn('[production/lines PATCH] cascade order status failed:', cascadeErr)
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[production/lines PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
