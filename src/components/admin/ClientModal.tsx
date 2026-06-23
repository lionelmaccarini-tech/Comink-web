'use client'

import React, { useState, useEffect } from 'react'
import { X, UserPlus, Trash2, Crown, User, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

interface Props {
  client?: any
  priceLists: any[]
  onClose: () => void
  onSaved: (c: any) => void
}

export default function ClientModal({ client, priceLists, onClose, onSaved }: Props) {
  const isNew = !client?.id
  const [tab, setTab] = useState<'info' | 'membres' | 'conditions'>('info')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', vat_number: '',
    address_line1: '', address_line2: '', city: '', postal_code: '', country: 'BE',
    price_list_id: '', discount_percent: 0, notes: '', is_active: true,
  })

  // Conditions commerciales
  const [allowCard,     setAllowCard]     = useState(true)
  const [allowAlma,     setAllowAlma]     = useState(true)
  const [allowWire,     setAllowWire]     = useState(true)
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState<string>('')
  const [billingEndOfMonth, setBillingEndOfMonth]     = useState(false)
  const [allowPickup,   setAllowPickup]   = useState(true)
  const [allowParcel,   setAllowParcel]   = useState(true)
  const [allowExpress,  setAllowExpress]  = useState(true)
  const [freeShipping,  setFreeShipping]  = useState(false)

  // Members state
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  async function loadMembers() {
    if (!client?.id) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/members?client_account_id=${client.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setMembers(data)
    } finally {
      setMembersLoading(false)
    }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        vat_number: client.vat_number ?? '',
        address_line1: client.address_line1 ?? '',
        address_line2: client.address_line2 ?? '',
        city: client.city ?? '',
        postal_code: client.postal_code ?? '',
        country: client.country ?? 'BE',
        price_list_id: client.price_list_id ?? '',
        discount_percent: client.discount_percent ?? 0,
        notes: client.notes ?? '',
        is_active: client.is_active ?? true,
      })
      setMembers(client.members ?? [])

      // Conditions commerciales — load from profile overrides if present
      const pm: string[] | null = client.payment_methods_override ?? null
      if (pm !== null) {
        setAllowCard(pm.includes('card'))
        setAllowAlma(pm.includes('alma'))
        setAllowWire(pm.includes('wire'))
      }
      setPaymentDeadlineDays(client.payment_deadline_days != null ? String(client.payment_deadline_days) : '')
      setBillingEndOfMonth(client.billing_end_of_month ?? false)

      const dm: string[] | null = client.delivery_methods_override ?? null
      if (dm !== null) {
        setAllowPickup(dm.includes('pickup'))
        setAllowParcel(dm.includes('parcel'))
        setAllowExpress(dm.includes('express'))
      }
      setFreeShipping(client.free_shipping ?? false)
      // Charger les membres depuis l'API à l'ouverture
      if (client.id) {
        fetch(`/api/admin/clients/members?client_account_id=${client.id}`)
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setMembers(data) })
          .catch(() => {})
      }
    }
  }, [client])

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setError('Nom et email obligatoires'); return }
    setSaving(true); setError('')
    try {
      // Build payment/delivery overrides
      const allPayment = allowCard && allowAlma && allowWire
      const paymentOverride: string[] | null = allPayment ? null : [
        ...(allowCard ? ['card']   : []),
        ...(allowAlma ? ['alma']   : []),
        ...(allowWire ? ['wire']   : []),
      ]
      const allDelivery = allowPickup && allowParcel && allowExpress
      const deliveryOverride: string[] | null = allDelivery ? null : [
        ...(allowPickup  ? ['pickup']  : []),
        ...(allowParcel  ? ['parcel']  : []),
        ...(allowExpress ? ['express'] : []),
      ]
      const deadlineDays = paymentDeadlineDays.trim() !== '' ? Number(paymentDeadlineDays) : null

      const payload = {
        ...(client?.id ? { id: client.id } : {}),
        ...form,
        price_list_id: form.price_list_id || null,
        discount_percent: Number(form.discount_percent) || 0,
        billing_end_of_month: billingEndOfMonth,
        free_shipping: freeShipping,
        payment_deadline_days: deadlineDays,
        payment_methods_override: paymentOverride,
        delivery_methods_override: deliveryOverride,
      }
      const method = client?.id ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/clients', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onSaved({ ...json, members })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!client?.id) { setError('Sauvegardez d\'abord le client.'); return }
    setInviting(true); setInviteMsg(null); setInviteUrl(null)
    try {
      const res = await fetch('/api/admin/clients/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          client_account_id: client.id,
          client_name: form.name,
          email: inviteEmail,
          full_name: inviteName || undefined,
          role: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInviteMsg({ type: 'ok', text: data.email_sent ? `Invitation envoyée à ${inviteEmail}` : `Lien généré — copie ci-dessous` })
      if (data.invite_url) setInviteUrl(data.invite_url)
      setInviteEmail(''); setInviteName('')
      // Recharger la liste des membres depuis l'API
      await loadMembers()
    } catch (e: any) {
      setInviteMsg({ type: 'err', text: e.message })
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(member: any) {
    if (!confirm(`Retirer ${member.profile?.email} de ce compte ?`)) return
    await fetch(`/api/admin/clients/members?id=${member.id}&profile_id=${member.profile?.id}`, { method: 'DELETE' })
    setMembers(m => m.filter(x => x.id !== member.id))
  }

  async function handleChangeRole(member: any, role: string) {
    await fetch('/api/admin/clients/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: member.id, role }) })
    setMembers(m => m.map(x => x.id === member.id ? { ...x, role } : x))
  }

  const tabs = [
    { id: 'info', label: 'Informations' },
    { id: 'membres', label: `Utilisateurs${members.length ? ` (${members.length})` : ''}` },
    { id: 'conditions', label: 'Conditions commerciales' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isNew ? 'Nouveau compte client' : 'Modifier le client'}</h2>
            {form.name && <p className="text-xs text-slate-400 mt-0.5">{form.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
              <div onClick={() => set('is_active', !form.is_active)}
                className={cn('relative w-10 h-5 rounded-full transition-colors', form.is_active ? 'bg-green-500' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-5' : 'translate-x-0.5')} />
              </div>
              {form.is_active ? 'Actif' : 'Inactif'}
            </label>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px', tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* ── INFO ── */}
          {tab === 'info' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Raison sociale *">
                    <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="ACME SPRL" />
                  </Field>
                </div>
                <Field label="Email facturation *">
                  <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="compta@acme.be" />
                </Field>
                <Field label="Téléphone">
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 4 xxx xx xx" />
                </Field>
                <Field label="Numéro TVA" hint="Format: BE0123456789">
                  <input className={inputCls} value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="BE0123456789" />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Adresse de facturation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Rue et numéro">
                      <input className={inputCls} value={form.address_line1} onChange={e => set('address_line1', e.target.value)} placeholder="Rue de la Paix 12" />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Complément">
                      <input className={inputCls} value={form.address_line2} onChange={e => set('address_line2', e.target.value)} placeholder="Bâtiment A, 3e étage" />
                    </Field>
                  </div>
                  <Field label="Code postal">
                    <input className={inputCls} value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="4000" />
                  </Field>
                  <Field label="Ville">
                    <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Liège" />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tarification</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Liste de prix" hint="Prioritaire sur la remise globale">
                    <select className={inputCls} value={form.price_list_id} onChange={e => set('price_list_id', e.target.value)}>
                      <option value="">— Prix catalogue (aucune liste) —</option>
                      {priceLists.map(pl => (
                        <option key={pl.id} value={pl.id}>{pl.name}{pl.discount_percent ? ` (−${pl.discount_percent}%)` : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Remise globale (%)" hint="Si pas de liste de prix assignée">
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" step="0.5" className={inputCls} value={form.discount_percent}
                        onChange={e => set('discount_percent', e.target.value)} />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <Field label="Notes internes">
                  <textarea className={cn(inputCls, 'resize-none')} rows={2} value={form.notes}
                    onChange={e => set('notes', e.target.value)} placeholder="Remarques, préférences, historique…" />
                </Field>
              </div>
            </>
          )}

          {/* ── CONDITIONS COMMERCIALES ── */}
          {tab === 'conditions' && (
            <div className="space-y-6">
              {/* Modes de paiement */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modes de paiement autorisés</p>
                <p className="text-[11px] text-slate-400 mb-3">Si tout est coché (ou décoché), le comportement global s'applique.</p>
                <div className="space-y-2">
                  {[
                    { key: 'card',  label: 'Carte bancaire (Stripe)', checked: allowCard,  set: setAllowCard },
                    { key: 'alma',  label: 'Alma paiement 3×',        checked: allowAlma,  set: setAllowAlma },
                    { key: 'wire',  label: 'Virement bancaire',        checked: allowWire,  set: setAllowWire },
                  ].map(({ key, label, checked, set }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Délai de paiement */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Délai de paiement</p>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="number"
                    min="0"
                    value={paymentDeadlineDays}
                    onChange={e => setPaymentDeadlineDays(e.target.value)}
                    placeholder="Défaut global"
                    className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">jours (vide = défaut global)</span>
                </div>

                {/* Facturation fin de mois */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={billingEndOfMonth}
                    onChange={e => setBillingEndOfMonth(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-blue-600 flex-shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                      Facturation fin de mois
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Les commandes du mois sont regroupées et facturées en une seule fois à la fin du mois, au lieu d'être facturées individuellement.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modes de livraison */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modes de livraison autorisés</p>
                <div className="space-y-2">
                  {[
                    { key: 'pickup',  label: 'Enlèvement atelier',   checked: allowPickup,  set: setAllowPickup },
                    { key: 'parcel',  label: 'Livraison colis 48h',  checked: allowParcel,  set: setAllowParcel },
                    { key: 'express', label: 'Livraison express',     checked: allowExpress, set: setAllowExpress },
                  ].map(({ key, label, checked, set }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">null (tout coché) = tous les modes globaux s'appliquent</p>
              </div>

              {/* Franco de port */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Frais de livraison</p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={freeShipping}
                    onChange={e => setFreeShipping(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-blue-600 flex-shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                      Franco de port
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      La livraison est toujours offerte pour ce compte, quel que soit le montant de la commande.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ── MEMBRES ── */}
          {tab === 'membres' && (
            <div className="space-y-4">
              {isNew && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  Sauvegardez d'abord le compte client pour pouvoir ajouter des utilisateurs.
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 mb-3">Inviter un utilisateur</p>
                <form onSubmit={handleInvite} className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text" disabled={isNew}
                      className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder="Prénom Nom"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                    />
                    <input
                      type="email" required disabled={isNew}
                      className="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder="email@exemple.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                    <select disabled={isNew}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white disabled:opacity-50"
                      value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="owner">Responsable (owner)</option>
                      <option value="member">Membre</option>
                    </select>
                    <button type="submit" disabled={inviting || isNew}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                      <UserPlus className="w-4 h-4" /> {inviting ? '…' : 'Inviter'}
                    </button>
                  </div>
                </form>
                {inviteMsg && (
                  <p className={cn('mt-2 text-xs font-medium', inviteMsg.type === 'ok' ? 'text-green-600' : 'text-red-600')}>
                    {inviteMsg.type === 'ok' ? '✓' : '✗'} {inviteMsg.text}
                  </p>
                )}
                {inviteUrl && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input readOnly value={inviteUrl} className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1 font-mono truncate" />
                    <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded whitespace-nowrap">Copier</button>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">Un email d'invitation sera envoyé. Les commandes de tous les membres sont regroupées sous ce compte pour la facturation.</p>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Aucun utilisateur lié à ce compte.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', m.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                        {m.role === 'owner' ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{m.profile?.full_name || m.profile?.email}</p>
                        <p className="text-xs text-slate-400 truncate">{m.profile?.email}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={e => handleChangeRole(m, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
                      >
                        <option value="owner">Responsable</option>
                        <option value="member">Membre</option>
                      </select>
                      <button onClick={() => handleRemoveMember(m)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {members.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  <strong>{members.length} utilisateur{members.length > 1 ? 's' : ''}</strong> lié{members.length > 1 ? 's' : ''} à ce compte.
                  {form.price_list_id
                    ? ' Tous bénéficient de la liste de prix assignée.'
                    : form.discount_percent > 0
                    ? ` Tous bénéficient de ${form.discount_percent}% de remise.`
                    : ' Aucune remise appliquée (prix catalogue).'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Fermer</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Enregistrement…' : isNew ? 'Créer le client' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
