import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const method = searchParams.get('method')

    // 1. Get all production_statuses where is_final = true
    const { data: finalStatuses } = await supabase
      .from('production_statuses')
      .select('id')
      .eq('is_final', true)
    const finalIds = finalStatuses?.map((s: { id: string }) => s.id) ?? []

    // 2. Get orders with delivery_method set
    let ordersQuery = supabase
      .from('orders')
      .select('id, order_number, client_name, client_email, delivery_method, delivery_status, delivery_cost, total, pickup_signed_by, pickup_signed_at, carrier_name, tracking_number, carrier_handoff_at, created_at')
      .not('delivery_method', 'is', null)
      .order('created_at', { ascending: false })

    if (method) {
      ordersQuery = ordersQuery.eq('delivery_method', method)
    }

    const { data: orders, error: ordersError } = await ordersQuery
    if (ordersError) throw ordersError

    if (!orders || orders.length === 0) {
      return NextResponse.json([])
    }

    // 3. Get production_lines grouped by order_id
    const orderIds = orders.map((o: { id: string }) => o.id)
    const { data: allLines } = await supabase
      .from('production_lines')
      .select('order_id, status_id')
      .in('order_id', orderIds)

    // 4. For each order, check if all its lines are final
    const linesMap: Record<string, Array<{ order_id: string; status_id: string }>> = {}
    for (const line of allLines ?? []) {
      if (!linesMap[line.order_id]) linesMap[line.order_id] = []
      linesMap[line.order_id].push(line)
    }

    const finalIdSet = new Set(finalIds)
    const pendingToReadyIds: string[] = []

    for (const order of orders) {
      if (order.delivery_status !== 'pending') continue
      const lines = linesMap[order.id] ?? []
      if (lines.length > 0 && lines.every((l: { order_id: string; status_id: string }) => finalIdSet.has(l.status_id))) {
        pendingToReadyIds.push(order.id)
      }
    }

    // 5. Update pending orders where all lines are final to 'ready'
    if (pendingToReadyIds.length > 0) {
      await supabase
        .from('orders')
        .update({ delivery_status: 'ready' })
        .in('id', pendingToReadyIds)

      // Update in-memory
      for (const order of orders) {
        if (pendingToReadyIds.includes(order.id)) {
          order.delivery_status = 'ready'
        }
      }
    }

    return NextResponse.json(orders)
  } catch (err) {
    console.error('[production/deliveries GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
