import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

/**
 * POST /api/production/orders/sync-status
 * Body: { order_id: string }
 * Recalcule le statut de la commande à partir de ses lignes de production :
 *   - toutes initiales  → pending (En attente)
 *   - mix               → in_production (En cours)
 *   - toutes finales    → shipped (Finalisée / Expédiée) ou ready
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { order_id } = await req.json()
    if (!order_id) return NextResponse.json({ error: 'order_id requis' }, { status: 400 })

    // Tous les statuts de production
    const { data: allStatuses } = await supabase
      .from('production_statuses')
      .select('id, name, is_initial, is_final')

    if (!allStatuses) return NextResponse.json({ error: 'Statuts introuvables' }, { status: 500 })

    const initialIds = new Set(allStatuses.filter((s: any) => s.is_initial).map((s: any) => s.id))
    const finalIds   = new Set(allStatuses.filter((s: any) => s.is_final).map((s: any) => s.id))

    // Lignes de la commande
    const { data: lines } = await supabase
      .from('production_lines')
      .select('id, status_id')
      .eq('order_id', order_id)

    if (!lines || lines.length === 0) {
      return NextResponse.json({ message: 'Aucune ligne trouvée', changed: false })
    }

    const allInitial = lines.every((l: any) => initialIds.has(l.status_id))
    const allFinal   = lines.every((l: any) => finalIds.has(l.status_id))

    let newOrderStatus: string
    if (allInitial) {
      newOrderStatus = 'pending'
    } else if (allFinal) {
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

    // Ne pas rétrograder delivered/cancelled
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .single()

    if (currentOrder?.status === 'delivered' || currentOrder?.status === 'cancelled') {
      return NextResponse.json({ message: `Commande déjà en statut ${currentOrder.status}`, changed: false })
    }

    if (currentOrder?.status === newOrderStatus) {
      return NextResponse.json({ message: 'Statut déjà à jour', changed: false })
    }

    await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', order_id)

    return NextResponse.json({ message: `Commande → ${newOrderStatus}`, changed: true, new_status: newOrderStatus })
  } catch (err) {
    console.error('[sync-status]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
