'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Euro, Building2, Phone } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STAGES = [
  { id: 'lead',        label: 'Lead',          color: 'border-slate-300',   badge: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400' },
  { id: 'contacted',   label: 'Contacté',      color: 'border-blue-300',    badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  { id: 'quoted',      label: 'Devis envoyé',  color: 'border-violet-300',  badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { id: 'negotiation', label: 'Négociation',   color: 'border-amber-300',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  { id: 'won',         label: 'Gagné',         color: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { id: 'lost',        label: 'Perdu',         color: 'border-red-300',     badge: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
]

interface Quote {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  client_company?: string
  client_phone?: string
  pipeline_stage: string
  expected_amount?: number
  total?: number
  probability?: number
  next_action_date?: string
  assignee?: { full_name: string }
  source?: string
  created_at?: string
}

export default function PipelineBoard({ initialStage }: { initialStage?: string }) {
  const [quotes, setQuotes]     = useState<Quote[]>([])
  const [loading, setLoading]   = useState(true)
  const [moving, setMoving]     = useState<string | null>(null)
  const [activeStage, setActive] = useState<string | null>(initialStage || null)

  const load = () => {
    setLoading(true)
    fetch('/api/crm/quotes?limit=200')
      .then(r => r.json())
      .then(d => setQuotes(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const moveStage = async (quoteId: string, newStage: string) => {
    setMoving(quoteId)
    await fetch(`/api/crm/quotes/${quoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: newStage }),
    })
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, pipeline_stage: newStage } : q))
    setMoving(null)
  }

  const visibleStages = activeStage ? STAGES.filter(s => s.id === activeStage) : STAGES

  return (
    <div>
      {/* Stage filter tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setActive(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!activeStage ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
          Tous
        </button>
        {STAGES.map(s => {
          const count = quotes.filter(q => q.pipeline_stage === s.id).length
          return (
            <button key={s.id} onClick={() => setActive(s.id === activeStage ? null : s.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeStage === s.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeStage === s.id ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
            </button>
          )
        })}
        <div className="flex-1" />
        <Link href="/crm/quotes/new"
          className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nouveau devis
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className={`grid gap-4 ${visibleStages.length === 1 ? 'grid-cols-1 max-w-lg' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'}`}>
          {STAGES.filter(s => !activeStage || s.id === activeStage).map(stage => {
            const stageQuotes = quotes.filter(q => q.pipeline_stage === stage.id)
            const total = stageQuotes.reduce((s, q) => s + (q.expected_amount || q.total || 0), 0)
            const stageIdx = STAGES.findIndex(s => s.id === stage.id)

            return (
              <div key={stage.id} className={`bg-white rounded-xl border-t-4 ${stage.color} shadow-sm`}>
                {/* Column header */}
                <div className="px-3 py-3 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.badge}`}>{stage.label}</span>
                    <span className="text-xs text-slate-400 font-medium">{stageQuotes.length}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{fmt(total)}</p>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {stageQuotes.map(q => (
                    <div key={q.id} className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 rounded-lg p-3 transition-all group cursor-pointer"
                      onClick={() => window.location.href = `/crm/quotes/${q.id}`}>
                      {/* Client */}
                      <p className="text-sm font-semibold text-slate-800 truncate">{q.client_name}</p>
                      {q.client_company && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" /> {q.client_company}
                        </p>
                      )}
                      {q.created_at && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          📅 {new Date(q.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      {/* Amount */}
                      <p className="text-sm font-bold text-blue-600 mt-2">{fmt(q.expected_amount || q.total || 0)}</p>
                      {/* Probability */}
                      {q.probability !== undefined && (
                        <div className="mt-2">
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${q.probability}%` }} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{q.probability}% probabilité</p>
                        </div>
                      )}
                      {/* Assignee */}
                      {q.assignee && (
                        <p className="text-xs text-slate-400 mt-1.5 truncate">
                          👤 {q.assignee.full_name}
                        </p>
                      )}
                      {/* Next action */}
                      {q.next_action_date && (
                        <p className={`text-xs mt-1 ${new Date(q.next_action_date) < new Date() ? 'text-red-500 font-semibold' : 'text-amber-600'}`}>
                          ⏰ {new Date(q.next_action_date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {stageIdx > 0 && (
                          <button
                            disabled={moving === q.id}
                            onClick={() => moveStage(q.id, STAGES[stageIdx - 1].id)}
                            className="flex-1 text-xs py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                            ← {STAGES[stageIdx - 1].label}
                          </button>
                        )}
                        {stageIdx < STAGES.length - 1 && (
                          <button
                            disabled={moving === q.id}
                            onClick={() => moveStage(q.id, STAGES[stageIdx + 1].id)}
                            className="flex-1 text-xs py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5">
                            {STAGES[stageIdx + 1].label} <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageQuotes.length === 0 && (
                    <div className="text-center text-slate-300 text-xs py-6">Vide</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
