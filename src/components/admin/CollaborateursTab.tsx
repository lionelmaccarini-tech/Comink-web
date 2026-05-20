'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, Shield, User, Wrench, Trash2, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'admin',         label: 'Admin',         color: 'bg-purple-100 text-purple-700',  icon: Shield },
  { value: 'collaborateur', label: 'Collaborateur',  color: 'bg-blue-100 text-blue-700',     icon: User },
  { value: 'vendeur',       label: 'Vendeur',        color: 'bg-emerald-100 text-emerald-700', icon: TrendingUp },
  { value: 'producteur',    label: 'Producteur',     color: 'bg-amber-100 text-amber-700',   icon: Wrench },
  { value: 'user',          label: 'Utilisateur',    color: 'bg-slate-100 text-slate-600',   icon: User },
]

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role) ?? ROLES[3]
  return <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', r.color)}>{r.label}</span>
}

export default function CollaborateursTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('collaborateur')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/collaborateurs')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteMsg(null)
    try {
      const res = await fetch('/api/admin/collaborateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInviteMsg({ type: 'ok', text: `Rôle "${inviteRole}" attribué à ${inviteEmail}` })
      setInviteEmail('')
      loadUsers()
    } catch (e: any) {
      setInviteMsg({ type: 'err', text: e.message })
    } finally {
      setInviting(false)
    }
  }

  async function changeRole(id: string, role: string) {
    await fetch('/api/admin/collaborateurs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x))
  }

  const filtered = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Invite card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Attribuer un rôle</h3>
        <p className="text-xs text-slate-500 mb-4">La personne doit d'abord créer un compte sur le site. Entrez son email pour lui attribuer un rôle.</p>
        <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
          <input
            type="email" required
            className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="email@exemple.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
          >
            {ROLES.filter(r => r.value !== 'user').map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            type="submit" disabled={inviting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {inviting ? 'En cours…' : 'Attribuer'}
          </button>
        </form>
        {inviteMsg && (
          <p className={cn('mt-3 text-sm font-medium', inviteMsg.type === 'ok' ? 'text-green-600' : 'text-red-600')}>
            {inviteMsg.type === 'ok' ? '✓' : '✗'} {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Roles explanation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { role: 'admin',         desc: 'Accès complet : produits, commandes, CRM, collaborateurs, stats.' },
          { role: 'collaborateur', desc: 'CRM, devis, production, gestion du site. Tout sauf la gestion des comptes.' },
          { role: 'vendeur',       desc: 'Accès CRM uniquement : créer et envoyer des devis, suivre les opportunités.' },
          { role: 'producteur',    desc: 'Accès production et suivi des commandes. Ne voit pas l\'administration.' },
        ].map(({ role, desc }) => (
          <div key={role} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <RoleBadge role={role} />
            <p className="text-xs text-slate-500 mt-2">{desc}</p>
          </div>
        ))}
      </div>

      {/* Users list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Équipe ({users.length})</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={loadUsers} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? 'Aucun utilisateur trouvé' : 'Aucun collaborateur encore. Ajoutez des membres ci-dessus.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Utilisateur</th>
                <th className="px-5 py-3 text-left">Rôle</th>
                <th className="px-5 py-3 text-left">Membre depuis</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.full_name || '—'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {new Date(u.created_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => changeRole(u.id, 'user')}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                        title="Révoquer l'accès (remet en utilisateur)"
                      >
                        Révoquer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
