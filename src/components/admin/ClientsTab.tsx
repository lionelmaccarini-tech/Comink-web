'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Building2, RefreshCw, Crown, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import ClientModal from './ClientModal'

export default function ClientsTab() {
  const [clients, setClients]       = useState<any[]>([])
  const [priceLists, setPriceLists] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const LIMIT = 50

  async function load(p = page, s = search) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), ...(s ? { search: s } : {}) })
      const [cRes, plRes] = await Promise.all([
        fetch(`/api/admin/clients?${params}`),
        fetch('/api/admin/price-lists').catch(() => ({ json: () => [] })),
      ])
      const [cData, plData] = await Promise.all([cRes.json(), (plRes as any).json()])
      setClients(Array.isArray(cData) ? cData : (cData?.data ?? []))
      setTotal(cData?.total ?? (Array.isArray(cData) ? cData.length : 0))
      setPriceLists(Array.isArray(plData) ? plData : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1, '') }, [])

  // Recherche avec debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
      load(1, searchInput)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  function openCreate() { setEditingClient(null); setModalOpen(true) }
  function openEdit(c: any) { setEditingClient(c); setModalOpen(true) }

  function handleSaved(c: any) {
    setClients(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      return idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]
    })
    setModalOpen(false)
  }

  async function deleteClient(id: string) {
    if (!confirm('Supprimer ce compte client ? Les membres ne seront pas supprimés.')) return
    await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // Filtrage local sur la page courante
  const filtered = clients.filter(c => {
    if (filterActive === 'active' && !c.is_active) return false
    if (filterActive === 'inactive' && c.is_active) return false
    return true
  })

  const stats = {
    total,
    active: clients.filter(c => c.is_active).length,
    totalMembers: 0,
    withPriceList: clients.filter(c => c.price_list_id).length,
  }
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Comptes clients', value: stats.total, color: 'text-slate-900' },
          { label: 'Actifs', value: stats.active, color: 'text-green-600' },
          { label: 'Utilisateurs liés', value: stats.totalMembers, color: 'text-blue-600' },
          { label: 'Avec liste de prix', value: stats.withPriceList, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rechercher un client…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
        <button onClick={() => load(page, search)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
        </button>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Clients list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun compte client</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre premier compte client pour regrouper les commandes et gérer les tarifs.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const isExpanded = expanded === c.id
              const owner = c.members?.find((m: any) => m.role === 'owner')
              return (
                <div key={c.id}>
                  <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors', !c.is_active && 'opacity-60')}>
                    {/* Expand */}
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)} className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        {c.vat_number && <span className="text-[10px] text-slate-400 font-mono">{c.vat_number}</span>}
                        {!c.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Inactif</span>}
                      </div>
                      <p className="text-xs text-slate-400">{c.email}{c.city ? ` · ${c.city}` : ''}</p>
                    </div>

                    {/* Tarif */}
                    <div className="hidden sm:block text-right">
                      {c.price_list ? (
                        <p className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{c.price_list.name}</p>
                      ) : c.discount_percent > 0 ? (
                        <p className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">−{c.discount_percent}%</p>
                      ) : (
                        <p className="text-xs text-slate-300">Prix catalogue</p>
                      )}
                    </div>

                    {/* Members count */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.members?.length || 0}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: members */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="ml-14">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Utilisateurs liés</p>
                        {!c.members?.length ? (
                          <p className="text-xs text-slate-400">Aucun utilisateur lié. Cliquez sur Modifier pour en ajouter.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {c.members.map((m: any) => (
                              <div key={m.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                                {m.role === 'owner'
                                  ? <Crown className="w-3 h-3 text-amber-500" />
                                  : <Users className="w-3 h-3 text-blue-400" />}
                                <span className="font-medium text-slate-700">{m.profile?.full_name || m.profile?.email}</span>
                                <span className="text-slate-400">{m.profile?.email}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-xs text-slate-500 mt-3 italic border-l-2 border-slate-200 pl-3">{c.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Pagination + total */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{total} client{total > 1 ? 's' : ''} au total</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const np = page - 1; setPage(np); load(np, search) }}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
              ← Précédent
            </button>
            <span className="text-xs text-slate-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { const np = page + 1; setPage(np); load(np, search) }}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
              Suivant →
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editingClient}
          priceLists={priceLists}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
