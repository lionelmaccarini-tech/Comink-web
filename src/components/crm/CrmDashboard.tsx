'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Euro, Trophy, Target, Clock, Plus, ArrowRight, Phone, Mail, MessageSquare } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead:        { label: 'Lead',          color: 'bg-slate-100 text-slate-700' },
  contacted:   { label: 'Contacté',      color: 'bg-blue-100 text-blue-700' },
  quoted:      { label: 'Devis envoyé',  color: 'bg-violet-100 text-violet-700' },
  negotiation: { label: 'Négociation',   color: 'bg-amber-100 text-amber-700' },
  won:         { label: 'Gagné',         color: 'bg-emerald-100 text-emerald-700' },
  lost:        { label: 'Perdu',         color: 'bg-red-100 text-red-700' },
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  phone:    <Phone className="w-3 h-3" />,
  email:    <Mail className="w-3 h-3" />,
  web:      <MessageSquare className="w-3 h-3" />,
}

export default function CrmDashboard() {
  const [stats, setStats]   = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/crm/stats').then(r => r.json()),
      fetch('/api/crm/quotes?limit=8').then(r => r.json()),
    ]).then(([s, q]) => {
      setStats(s)
      setQuotes(Array.isArray(q) ? q : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statCards = [
    { label: 'Pipeline ouvert',    value: fmt(stats?.pipeline_value ?? 0),    icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Valeur pondérée',    value: fmt(stats?.weighted_value ?? 0),    icon: <Target className="w-5 h-5" />,     color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'Gagné ce mois',      value: fmt(stats?.won_this_month ?? 0),    icon: <Trophy className="w-5 h-5" />,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Taux de conversion', value: `${stats?.conversion_rate ?? 0} %`, icon: <Euro className="w-5 h-5" />,       color: 'text-amber-600',   bg: 'bg-amber-50' },
  ]

  const upcoming = quotes.filter(q =>
    q.next_action_date && new Date(q.next_action_date) <= new Date(Date.now() + 7 * 86400000)
    && !['won', 'lost'].includes(q.pipeline_stage)
  ).slice(0, 4)

  return (
    <div className="space-y-8">

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline by stage */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Répartition pipeline</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(stats?.by_stage ?? []).map((s: any) => {
            const { label, color } = STAGE_LABELS[s.stage] ?? { label: s.stage, color: 'bg-slate-100 text-slate-700' }
            return (
              <Link key={s.stage} href={`/crm/pipeline?stage=${s.stage}`}
                className="text-center p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                <p className="text-2xl font-bold text-slate-900 group-hover:text-blue-700">{s.count}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${color}`}>{label}</span>
                <p className="text-xs text-slate-400 mt-1">{fmt(s.amount)}</p>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent quotes */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Derniers devis</h2>
            <Link href="/crm/quotes" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {quotes.slice(0, 6).map(q => {
              const { label, color } = STAGE_LABELS[q.pipeline_stage] ?? { label: q.pipeline_stage, color: 'bg-slate-100 text-slate-700' }
              return (
                <Link key={q.id} href={`/crm/quotes/${q.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {(q.client_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{q.client_name}</p>
                    <p className="text-xs text-slate-400">{q.client_company || q.quote_number}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{fmt(q.expected_amount || q.total || 0)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>
                  </div>
                </Link>
              )
            })}
            {quotes.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucun devis pour l'instant
              </div>
            )}
          </div>
        </div>

        {/* Upcoming actions */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Actions à venir (7j)
            </h2>
            <Link href="/crm/quotes/new"
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              <Plus className="w-3.5 h-3.5" /> Nouveau devis
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {upcoming.map(q => {
              const date = new Date(q.next_action_date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })
              const isPast = new Date(q.next_action_date) < new Date()
              return (
                <Link key={q.id} href={`/crm/quotes/${q.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${isPast ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {date}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{q.client_name}</p>
                    <p className="text-xs text-slate-500 truncate">{q.next_action_note || 'Aucune note'}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{fmt(q.expected_amount || q.total || 0)}</span>
                </Link>
              )
            })}
            {upcoming.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aucune action planifiée cette semaine
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
