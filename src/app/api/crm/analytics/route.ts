import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export const runtime = 'nodejs'

/**
 * GET /api/crm/analytics
 * Stats du tableau de bord analytique CRM (réservé au staff).
 */
export async function GET() {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Requêtes en parallèle
    const [
      ordersThisMonth,
      ordersLastMonth,
      topProductsResult,
      activeClientsResult,
      pipelineResult,
    ] = await Promise.all([
      // Commandes ce mois
      supabase
        .from('orders')
        .select('id, total, client_email')
        .gte('created_at', startOfMonth),

      // Commandes mois précédent
      supabase
        .from('orders')
        .select('id, total')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth),

      // Top 5 produits depuis production_lines
      supabase
        .from('production_lines')
        .select('product_name, quantity')
        .not('product_name', 'is', null),

      // Clients actifs (ayant commandé dans les 90 jours)
      supabase
        .from('orders')
        .select('client_email')
        .gte('created_at', ninetyDaysAgo)
        .not('client_email', 'is', null),

      // Pipeline CRM (devis par stage)
      supabase
        .from('quotes')
        .select('pipeline_stage, total'),
    ])

    // ── CA ce mois ──
    const caThisMonth = (ordersThisMonth.data ?? []).reduce(
      (sum, o) => sum + (o.total ?? 0),
      0,
    )
    const countThisMonth = (ordersThisMonth.data ?? []).length
    const avgBasketThisMonth = countThisMonth > 0 ? caThisMonth / countThisMonth : 0

    // ── CA mois précédent ──
    const caLastMonth = (ordersLastMonth.data ?? []).reduce(
      (sum, o) => sum + (o.total ?? 0),
      0,
    )
    const countLastMonth = (ordersLastMonth.data ?? []).length

    // ── Tendance CA ──
    const caTrend =
      caLastMonth === 0
        ? null
        : Math.round(((caThisMonth - caLastMonth) / caLastMonth) * 100)

    // ── Top 5 produits ──
    const productMap: Record<string, number> = {}
    for (const line of topProductsResult.data ?? []) {
      if (!line.product_name) continue
      productMap[line.product_name] = (productMap[line.product_name] ?? 0) + (line.quantity ?? 1)
    }
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // ── Clients actifs ──
    const uniqueActiveClients = new Set(
      (activeClientsResult.data ?? []).map((o) => o.client_email),
    ).size

    // ── Pipeline CRM ──
    const pipelineMap: Record<string, { count: number; total: number }> = {}
    const STAGES = ['lead', 'contacted', 'quoted', 'negotiation', 'won', 'lost']
    for (const stage of STAGES) {
      pipelineMap[stage] = { count: 0, total: 0 }
    }
    for (const q of pipelineResult.data ?? []) {
      const stage = q.pipeline_stage ?? 'lead'
      if (!pipelineMap[stage]) pipelineMap[stage] = { count: 0, total: 0 }
      pipelineMap[stage].count++
      pipelineMap[stage].total += q.total ?? 0
    }

    return NextResponse.json({
      ca_this_month: caThisMonth,
      ca_last_month: caLastMonth,
      ca_trend_percent: caTrend,
      orders_this_month: countThisMonth,
      orders_last_month: countLastMonth,
      avg_basket: avgBasketThisMonth,
      top_products: topProducts,
      active_clients_90d: uniqueActiveClients,
      pipeline: pipelineMap,
    })
  } catch (err) {
    console.error('[crm/analytics GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
