'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, UserPlus, X, Check, Building2, Mail, Phone, AlertCircle, Loader2 } from 'lucide-react'

export interface ClientData {
  id?: string
  full_name: string
  email: string
  company?: string
  phone?: string
  vat_number?: string
}

interface Props {
  value: ClientData
  onChange: (client: ClientData) => void
  /** Name of the vendeur (shown in invite email) */
  vendeurName?: string
  /** ID of the vendeur — assigned to client on creation */
  vendeurId?: string
}

// ── New client form ────────────────────────────────────────────────────────────

function NewClientForm({
  onCreated,
  onCancel,
  vendeurName,
  vendeurId,
}: {
  onCreated: (client: ClientData) => void
  onCancel: () => void
  vendeurName?: string
  vendeurId?: string
}) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [company, setCompany] = useState('')
  const [phone,   setPhone]   = useState('')
  const [vat,     setVat]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [alreadyExists, setAlreadyExists] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Nom et email requis'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/crm/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
        phone: phone.trim() || null,
        vat_number: vat.trim() || null,
        invited_by_name: vendeurName,
        assigned_staff: vendeurId || null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'Erreur'); return }

    setAlreadyExists(!!data.already_exists)
    setSuccess(true)

    setTimeout(() => {
      onCreated({
        id:         data.id,
        full_name:  data.full_name  || name,
        email:      data.email      || email,
        company:    data.company    || company || undefined,
        phone:      data.phone      || phone   || undefined,
        vat_number: data.vat_number || vat     || undefined,
      })
    }, 1200)
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check className="w-6 h-6 text-emerald-600" />
      </div>
      <p className="font-semibold text-slate-800">
        {alreadyExists ? 'Client existant sélectionné' : 'Client créé avec succès !'}
      </p>
      {!alreadyExists && (
        <p className="text-sm text-slate-500 text-center">
          Un email d'invitation a été envoyé à <strong>{email}</strong>
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1 font-medium">Nom complet *</label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jean Dupont" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1 font-medium">Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="jean@exemple.be" />
          <p className="text-[11px] text-slate-400 mt-1">Un email d'invitation lui sera envoyé pour créer son mot de passe.</p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">Société</label>
          <input value={company} onChange={e => setCompany(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme SA" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">Téléphone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+32 4 ..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1 font-medium">Numéro TVA</label>
          <input value={vat} onChange={e => setVat(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="BE0123456789" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Création...' : 'Créer et inviter'}
        </button>
      </div>
    </form>
  )
}

// ── Main picker ────────────────────────────────────────────────────────────────

export default function ClientPicker({ value, onChange, vendeurName, vendeurId }: Props) {
  const [query,       setQuery]      = useState('')
  const [results,     setResults]    = useState<ClientData[]>([])
  const [searching,   setSearching]  = useState(false)
  const [open,        setOpen]       = useState(false)
  const [showCreate,  setShowCreate] = useState(false)
  const [currentUser, setCurrentUser] = useState<ClientData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  // Load current user profile for "Moi-même" shortcut
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, company, phone, vat_number')
          .eq('id', user.id)
          .single()
        if (data) {
          setCurrentUser({
            id:         data.id,
            full_name:  data.full_name  || user.email?.split('@')[0] || '',
            email:      data.email      || user.email || '',
            company:    data.company    || '',
            phone:      data.phone      || '',
            vat_number: data.vat_number || '',
          })
        }
      })
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Live search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/crm/clients?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
      setOpen(true)
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const select = (client: ClientData) => {
    onChange({
      id:         client.id,
      full_name:  client.full_name  || '',
      email:      client.email      || '',
      company:    client.company    || '',
      phone:      client.phone      || '',
      vat_number: client.vat_number || '',
    })
    setQuery('')
    setOpen(false)
    setResults([])
  }

  const clear = () => {
    onChange({ full_name: '', email: '', company: '', phone: '', vat_number: '' })
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const isSelected = !!value.email

  // ── If a client is already selected ────────────────────────────────────────
  if (isSelected) return (
    <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {value.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{value.full_name}</p>
        {value.company && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" /> {value.company}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          {value.email && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Mail className="w-3 h-3" /> {value.email}
            </p>
          )}
          {value.phone && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {value.phone}
            </p>
          )}
          {value.vat_number && (
            <p className="text-xs text-slate-500">TVA : {value.vat_number}</p>
          )}
        </div>
      </div>
      <button onClick={clear} className="text-slate-400 hover:text-red-400 transition-colors p-1 flex-shrink-0" title="Changer de client">
        <X className="w-4 h-4" />
      </button>
    </div>
  )

  // ── Picker (search + create) ────────────────────────────────────────────────
  return (
    <div>
      {showCreate ? (
        <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Nouveau client
            </h3>
          </div>
          <NewClientForm
            vendeurName={vendeurName}
            vendeurId={vendeurId}
            onCreated={client => { select(client); setShowCreate(false) }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      ) : (
        <div ref={dropRef} className="relative">

          {/* "Moi-même" quick-select */}
          {currentUser && (
            <button
              type="button"
              onClick={() => select(currentUser)}
              className="w-full flex items-center gap-3 mb-3 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(currentUser.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs text-slate-400 font-medium">Utiliser mon compte</p>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 truncate">
                  {currentUser.full_name}
                  {currentUser.company && <span className="font-normal text-slate-400"> · {currentUser.company}</span>}
                </p>
              </div>
              <span className="text-xs text-blue-500 font-semibold flex-shrink-0">Moi →</span>
            </button>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => query.length >= 2 && setOpen(true)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Rechercher un client existant (nom, email, société)..."
            />
          </div>

          {/* Dropdown */}
          {open && (query.length >= 2) && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {results.length > 0 ? (
                <>
                  {results.map(c => (
                    <button key={c.id ?? c.email} onMouseDown={() => select(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {(c.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{c.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {[c.company, c.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button onMouseDown={() => { setOpen(false); setShowCreate(true) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors border-t border-slate-100">
                    <UserPlus className="w-4 h-4" /> Créer un nouveau client
                  </button>
                </>
              ) : (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-slate-500 mb-3">Aucun client trouvé pour « {query} »</p>
                  <button onMouseDown={() => { setOpen(false); setShowCreate(true) }}
                    className="flex items-center gap-2 mx-auto text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <UserPlus className="w-4 h-4" /> Créer ce client
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Shortcut "create" button when no search */}
          {!query && (
            <button onClick={() => setShowCreate(true)}
              className="mt-2 flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              <UserPlus className="w-3.5 h-3.5" /> Créer un nouveau client
            </button>
          )}
        </div>
      )}
    </div>
  )
}
