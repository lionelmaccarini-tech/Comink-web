'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, ArrowUpDown, ChevronDown } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STAGE_STYLE: Record<string, string> = {
  lead:        'bg-slate-100 text-slate-700',
  contacted:   'bg-blue-100 text-blue-700',
  quoted:      'bg-violet-100 text-violet-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won:         'bg-emerald-100 text-emerald-700',
  lost:        'bg-red-100 text-red-700',
}
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', contacted: 'Contacté', quoted: 'Devis envoyé',
  negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu',
}

export default function QuotesList() {
  const [quotes,   setQuotes]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [stage,    setStage]    = useState('')
  const [sortBy,   setSortBy]   = useState<'created_at' | 'total' | 'client_name'>('created_at')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    setLoading(true)
    let url = '/api/crm/quotes?limit=200'
    if (stage)  url += `&stage=${stage}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    fetch(url).then(r => r.json()).then(d => {
      setQuotes(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [search, stage])

  const sorted = [...quotes].sort((a, b) => {
    let va = a[sortBy] ?? '', vb = b[sortBy] ?? ''
    if (typeof va === 'number' && typeof vb === 'number') return sortDesc ? vb - va : va - vb
    return sortDesc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb))
  })

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDesc(v => !v)
    else { setSortBy(col); setSortDesc(true) }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Rechercher client, société, n° devis..." />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
            <option value="">Tous les stades</option>
            {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <Link href="/crm/quotes/new"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nouveau devis
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-slate-400 py-16 text-sm">Aucun devis trouvé</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('client_name')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700">
                    Client <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">N° Devis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Stade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Assigné</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">
                  <button onClick={() => toggleSort('total')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 ml-auto">
                    Montant <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 ml-auto">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => window.location.href = `/crm/quotes/${q.id}`}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{q.client_name}</p>
                    {q.client_company && <p className="text-xs text-slate-400">{q.client_company}</p>}
                    <div className="sm:hidden mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STAGE_STYLE[q.pipeline_stage]}`}>
                        {STAGE_LABEL[q.pipeline_stage]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs hidden sm:table-cell">{q.quote_number}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_STYLE[q.pipeline_stage]}`}>
                      {STAGE_LABEL[q.pipeline_stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                    {q.assignee?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800 hidden md:table-cell">
                    {fmt(q.expected_amount || q.total || 0)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-400 text-xs">
                    {new Date(q.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2 text-right">{sorted.length} devis</p>
    </div>
  )
}
