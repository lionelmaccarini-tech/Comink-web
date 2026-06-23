'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Building2, RefreshCw, Crown, ChevronDown, ChevronRight, FileText, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import ClientModal from './ClientModal'
import PriceExportModal from './PriceExportModal'

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
  const [expandedMembers, setExpandedMembers] = useState<Record<string, any[]>>({})
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [exportClientId, setExportClientId] = useState<string | null>(null)
  const [exportTitle, setExportTitle] = useState('')
  const [bulkInviting, setBulkInviting] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const LIMIT = 50

  // Invite state per client
  const [inviteForm, setInviteForm] = useState<Record<string, { email: string; name: string }>>({})
  const [inviting, setInviting] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<Record<string, { ok: boolean; msg: string; url?: string }>>({})

  async function loadMembers(clientId: string) {
    const res = await fetch(`/api/admin/clients/members?client_account_id=${clientId}`)
    const data = await res.json()
    setExpandedMembers(m => ({ ...m, [clientId]: Array.isArray(data) ? data : [] }))
  }

  async function bulkInviteOwners() {
    if (!confirm('Créer un accès Responsable pour tous les clients sans utilisateur ?\nUn email sera envoyé à chaque email de facturation.')) return
    setBulkInviting(true); setBulkResult(null)
    try {
      const res = await fetch('/api/admin/clients/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_invite_owners' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ok = data.results.filter((r: any) => r.ok).length
      const fail = data.results.filter((r: any) => !r.ok).length
      setBulkResult(`✓ ${ok} invitation${ok > 1 ? 's' : ''} envoyée${ok > 1 ? 's' : ''}${fail ? ` · ${fail} erreur${fail > 1 ? 's' : ''}` : ''}`)
      load()
    } catch (e: any) {
      setBulkResult(`✗ ${e.message}`)
    } finally {
      setBulkInviting(false)
    }
  }

  async function toggleExpand(clientId: string) {
    if (expanded === clientId) {
      setExpanded(null)
    } else {
      setExpanded(clientId)
      loadMembers(clientId)
    }
  }

  async function sendInvite(clientId: string, clientName: string) {
    const form = inviteForm[clientId]
    if (!form?.email) return
    setInviting(clientId)
    setInviteResult(r => ({ ...r, [clientId]: { ok: false, msg: '' } }))
    try {
      const res = await fetch('/api/admin/clients/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          client_account_id: clientId,
          client_name: clientName,
          email: form.email.trim(),
          full_name: form.name.trim() || undefined,
          role: 'member',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const msg = data.email_sent ? `Invitation envoyée à ${form.email}` : `Lien généré — copie ci-dessous`
      setInviteResult(r => ({ ...r, [clientId]: { ok: true, msg, url: data.invite_url } }))
      setInviteForm(f => ({ ...f, [clientId]: { email: '', name: '' } }))
      // Reload members for this client
      loadMembers(clientId)
    } catch (e: any) {
      setInviteResult(r => ({ ...r, [clientId]: { ok: false, msg: e.message } }))
    } finally {
      setInviting(null)
    }
  }

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
    totalMembers: clients.reduce((sum, c) => sum + (c.member_count ?? 0), 0),
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
        <button onClick={bulkInviteOwners} disabled={bulkInviting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50">
          <Mail className="w-4 h-4" /> {bulkInviting ? 'Envoi…' : 'Inviter les responsables'}
        </button>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {bulkResult && (
        <div className={cn('text-sm font-medium px-4 py-2 rounded-lg', bulkResult.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
          {bulkResult}
        </div>
      )}

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
              const members = expandedMembers[c.id] ?? c.members ?? []
              return (
                <div key={c.id}>
                  <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors', !c.is_active && 'opacity-60')}>
                    {/* Expand */}
                    <button onClick={() => toggleExpand(c.id)} className="text-slate-400 hover:text-slate-600">
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
                      <span>{isExpanded ? members.length : (c.member_count ?? 0)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setExportClientId(c.id); setExportTitle(c.name) }}
                        className="p-1.5 hover:bg-sky-50 rounded-lg text-slate-400 hover:text-sky-600 transition-colors"
                        title="Liste de prix"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: members + invite */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="ml-14">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Utilisateurs liés</p>
                        {!members.length ? (
                          <p className="text-xs text-slate-400 mb-3">Aucun utilisateur lié pour l'instant.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {members.map((m: any) => (
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

                        {/* Invite form */}
                        <div className="bg-white border border-blue-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-500" />
                            Inviter un utilisateur
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <input
                              type="text"
                              placeholder="Prénom Nom"
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-32"
                              value={inviteForm[c.id]?.name || ''}
                              onChange={e => setInviteForm(f => ({ ...f, [c.id]: { ...f[c.id], name: e.target.value } }))}
                            />
                            <input
                              type="email"
                              placeholder="email@client.com"
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-[160px]"
                              value={inviteForm[c.id]?.email || ''}
                              onChange={e => setInviteForm(f => ({ ...f, [c.id]: { ...f[c.id], email: e.target.value } }))}
                            />
                            <button
                              onClick={() => sendInvite(c.id, c.name)}
                              disabled={inviting === c.id || !inviteForm[c.id]?.email}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <Mail className="w-3 h-3" />
                              {inviting === c.id ? 'Envoi…' : 'Inviter'}
                            </button>
                          </div>
                          {inviteResult[c.id]?.msg && (
                            <p className={cn('text-xs mt-2', inviteResult[c.id].ok ? 'text-green-600' : 'text-red-500')}>
                              {inviteResult[c.id].ok ? '✓' : '✗'} {inviteResult[c.id].msg}
                            </p>
                          )}
                          {inviteResult[c.id]?.url && (
                            <div className="mt-2 flex gap-2 items-center">
                              <input readOnly value={inviteResult[c.id].url!} className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1 font-mono truncate" />
                              <button onClick={() => navigator.clipboard.writeText(inviteResult[c.id].url!)} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded whitespace-nowrap">Copier</button>
                            </div>
                          )}
                        </div>

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

      {exportClientId && (
        <PriceExportModal
          clientId={exportClientId}
          title={exportTitle}
          onClose={() => setExportClientId(null)}
        />
      )}
    </div>
  )
}
