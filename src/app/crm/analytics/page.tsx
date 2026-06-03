'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, ShoppingCart, Users, Package, BarChart3 } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Contacté',
  quoted: 'Devis envoyé',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

const STAGE_COLOR: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  quoted: 'bg-violet-100 text-violet-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
}

interface Analytics {
  ca_this_month: number
  ca_last_month: number
  ca_trend_percent: number | null
  orders_this_month: number
  orders_last_month: number
  avg_basket: number
  top_products: Array<{ name: string; count: number }>
  active_clients_90d: number
  pipeline: Record<string, { count: number; total: number }>
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" /> +{value}%
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <TrendingDown className="w-3 h-3" /> {value}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" /> 0%
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  trend?: number | null
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend ?? null} />}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthLabel = new Date().toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/analytics')
      if (!res.ok) throw new Error('Erreur')
      setData(await res.json())
    } catch {
      setError('Impossible de charger les statistiques.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Calculer le total du pipeline actif (hors won/lost)
  const pipelineActive = data
    ? Object.entries(data.pipeline)
        .filter(([stage]) => stage !== 'won' && stage !== 'lost')
        .reduce((sum, [, v]) => sum + v.total, 0)
    : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord analytique</h1>
          <p className="text-slate-500 text-sm mt-0.5">Données en temps réel depuis Supabase</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<BarChart3 className="w-4 h-4" />}
              label={`CA ${monthLabel}`}
              value={fmt(data.ca_this_month)}
              sub={`Mois précédent : ${fmt(data.ca_last_month)}`}
              trend={data.ca_trend_percent}
            />
            <StatCard
              icon={<ShoppingCart className="w-4 h-4" />}
              label="Commandes ce mois"
              value={String(data.orders_this_month)}
              sub={`Mois précédent : ${data.orders_last_month}`}
              trend={
                data.orders_last_month === 0
                  ? null
                  : Math.round(((data.orders_this_month - data.orders_last_month) / data.orders_last_month) * 100)
              }
            />
            <StatCard
              icon={<ShoppingCart className="w-4 h-4" />}
              label="Panier moyen"
              value={fmt(data.avg_basket)}
              sub={`Sur ${data.orders_this_month} commande${data.orders_this_month > 1 ? 's' : ''}`}
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Clients actifs"
              value={String(data.active_clients_90d)}
              sub="Ayant commandé dans les 90 jours"
            />
          </div>

          {/* Pipeline + Top produits */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Pipeline CRM */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">Pipeline CRM</h2>
                <span className="text-xs text-slate-400 ml-auto">Pipeline actif : {fmt(pipelineActive)}</span>
              </div>
              <div className="space-y-2">
                {(['lead', 'contacted', 'quoted', 'negotiation', 'won', 'lost'] as const).map(stage => {
                  const d = data.pipeline[stage] ?? { count: 0, total: 0 }
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center flex-shrink-0 ${STAGE_COLOR[stage]}`}>
                        {STAGE_LABEL[stage]}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{
                              width: `${Math.min(100, d.count * 10)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700 w-6 text-right">{d.count}</span>
                      </div>
                      <span className="text-xs text-slate-500 w-20 text-right">{fmt(d.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top 5 produits */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">Top 5 produits</h2>
                <span className="text-xs text-slate-400 ml-auto">Toutes périodes</span>
              </div>

              {data.top_products.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-3">
                  {data.top_products.map((p, i) => {
                    const maxCount = data.top_products[0]?.count ?? 1
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-4 text-right flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${(p.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-600 flex-shrink-0">
                          {p.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
