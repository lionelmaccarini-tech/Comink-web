'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, Truck, User, LogOut, FileText, ShoppingCart, Trash2, AlertTriangle, Pencil, Plus, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate, formatPrice, isBelgianVAT, isIntraCommunityVAT, isValidVAT } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/useCart'
import type { Order } from '@/types'
import InvoicesTab from './InvoicesTab'

interface ProductionStatusDisplay {
  id: string
  name: string
  color: string
  sort_order: number
  is_initial: boolean
  is_final: boolean
}

interface ProductionLineDisplay {
  id: string
  product_name: string
  width_cm?: number | null
  height_cm?: number | null
  quantity: number
  file_thumb?: string | null
  status?: ProductionStatusDisplay
  status_id: string
}

function OrderProgressPanel({ orderId }: { orderId: string }) {
  const [lines, setLines] = useState<ProductionLineDisplay[]>([])
  const [allStatuses, setAllStatuses] = useState<ProductionStatusDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [linesRes, statusesRes] = await Promise.all([
          fetch(`/api/production/lines/client?order_id=${orderId}`),
          fetch('/api/production/statuses'),
        ])
        if (!cancelled) {
          if (linesRes.ok) setLines(await linesRes.json())
          if (statusesRes.ok) setAllStatuses(await statusesRes.json())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId])

  if (loading) return <div className="py-4 text-center text-xs text-slate-400">Chargement du suivi…</div>

  if (lines.length === 0) {
    return <p className="text-xs text-slate-400 py-2">Aucun suivi de production disponible pour cette commande.</p>
  }

  return (
    <div className="space-y-4 pt-2">
      {lines.map(line => {
        const lineStatus = line.status
        const sortedStatuses = [...allStatuses].sort((a, b) => a.sort_order - b.sort_order)
        const currentIdx = sortedStatuses.findIndex(s => s.id === line.status_id)
        const isFinal = lineStatus?.is_final ?? false
        return (
          <div key={line.id} className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
              {line.file_thumb ? (
                <img src={line.file_thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{line.product_name}</p>
                {(line.width_cm || line.height_cm) && (
                  <p className="text-[10px] text-slate-400">{line.width_cm}×{line.height_cm} cm · ×{line.quantity}</p>
                )}
              </div>
              {lineStatus && (
                <span
                  className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: lineStatus.color + '22', color: lineStatus.color }}
                >
                  {isFinal ? 'Prêt' : 'En cours'}
                </span>
              )}
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {sortedStatuses.map((s, i) => {
                const done = i <= currentIdx
                const active = i === currentIdx
                return (
                  <React.Fragment key={s.id}>
                    {i > 0 && (
                      <div className={`flex-1 min-w-[12px] h-0.5 rounded-full ${done ? 'bg-blue-400' : 'bg-slate-200'}`} />
                    )}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <div
                        className={`w-3 h-3 rounded-full border-2 transition-all ${active ? 'scale-125' : ''}`}
                        style={{
                          backgroundColor: done ? s.color : 'white',
                          borderColor: done ? s.color : '#e2e8f0',
                        }}
                      />
                      {active && (
                        <p className="text-[9px] font-bold whitespace-nowrap" style={{ color: s.color }}>
                          {s.name}
                        </p>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {lineStatus && (
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Statut actuel : <span className="font-bold" style={{ color: lineStatus.color }}>{lineStatus.name}</span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
  in_production: { label: 'En production', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Package },
  ready: { label: 'Prête', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  shipped: { label: 'Expédiée', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Truck },
  delivered: { label: 'Livrée', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'text-red-600 bg-red-50 border-red-200', icon: LogOut },
}

const QUOTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  sent: { label: 'Envoyé', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  accepted: { label: 'Accepté', color: 'text-green-600 bg-green-50 border-green-200' },
  refused: { label: 'Refusé', color: 'text-red-600 bg-red-50 border-red-200' },
  expired: { label: 'Expiré', color: 'text-slate-600 bg-slate-50 border-slate-200' },
}

interface ShippingAddress {
  id: string
  label: string
  name: string
  line1: string
  line2?: string
  city: string
  postal_code?: string
  country: string
  is_default: boolean
}

interface QuoteItem {
  id: string
  quote_number: string
  reference?: string
  cart_items: any[]
  total: number
  status: string
  created_at: string
  expires_at?: string
}

interface Props {
  user: any
  profile: any
  orders: Order[]
  quotes: QuoteItem[]
}

const COUNTRIES = [['BE','Belgique'],['FR','France'],['NL','Pays-Bas'],['LU','Luxembourg'],['DE','Allemagne']] as const

export default function CompteClient({ user, profile, orders, quotes: initialQuotes }: Props) {
  const router = useRouter()
  const { clearCart, addItem } = useCart()
  const [tab, setTab] = useState<'commandes' | 'devis' | 'factures' | 'profil'>('commandes')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [vatNumber, setVatNumber] = useState<string>(profile?.vat_number ?? '')
  const [savingVat, setSavingVat] = useState(false)
  const [vatSaved, setVatSaved] = useState(false)

  // Adresse de facturation
  const [billingLine1,   setBillingLine1]   = useState<string>((profile as any)?.billing_line1   ?? '')
  const [billingLine2,   setBillingLine2]   = useState<string>((profile as any)?.billing_line2   ?? '')
  const [billingCity,    setBillingCity]    = useState<string>((profile as any)?.billing_city    ?? '')
  const [billingPostal,  setBillingPostal]  = useState<string>((profile as any)?.billing_postal_code ?? '')
  const [billingCountry, setBillingCountry] = useState<string>((profile as any)?.billing_country ?? 'BE')
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrSaved,  setAddrSaved]  = useState(false)

  // Adresses de livraison
  const [shippingAddrs,   setShippingAddrs]   = useState<ShippingAddress[]>([])
  const [showAddrForm,    setShowAddrForm]    = useState(false)
  const [editingAddr,     setEditingAddr]     = useState<ShippingAddress | null>(null)
  const [savingAddrForm,  setSavingAddrForm]  = useState(false)
  const [deletingAddrId,  setDeletingAddrId]  = useState<string | null>(null)

  // Champs du formulaire d'adresse
  const [fLabel,   setFLabel]   = useState('')
  const [fName,    setFName]    = useState('')
  const [fLine1,   setFLine1]   = useState('')
  const [fLine2,   setFLine2]   = useState('')
  const [fCity,    setFCity]    = useState('')
  const [fPostal,  setFPostal]  = useState('')
  const [fCountry, setFCountry] = useState('BE')

  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes)
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)

  async function loadShippingAddrs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    setShippingAddrs((data as ShippingAddress[]) ?? [])
  }

  useEffect(() => {
    loadShippingAddrs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveAddresses() {
    setSavingAddr(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({
        billing_line1:       billingLine1 || null,
        billing_line2:       billingLine2 || null,
        billing_city:        billingCity  || null,
        billing_postal_code: billingPostal || null,
        billing_country:     billingCountry,
      }).eq('id', user.id)
      setAddrSaved(true)
      setTimeout(() => setAddrSaved(false), 2500)
    } finally {
      setSavingAddr(false)
    }
  }

  function openNewAddrForm() {
    setEditingAddr(null)
    setFLabel(''); setFName(''); setFLine1(''); setFLine2(''); setFCity(''); setFPostal(''); setFCountry('BE')
    setShowAddrForm(true)
  }

  function openEditAddrForm(addr: ShippingAddress) {
    setEditingAddr(addr)
    setFLabel(addr.label); setFName(addr.name); setFLine1(addr.line1); setFLine2(addr.line2 ?? ''); setFCity(addr.city); setFPostal(addr.postal_code ?? ''); setFCountry(addr.country)
    setShowAddrForm(true)
  }

  async function handleSaveAddrForm() {
    setSavingAddrForm(true)
    try {
      const supabase = createClient()
      const payload = {
        label:       fLabel,
        name:        fName,
        line1:       fLine1,
        line2:       fLine2 || null,
        city:        fCity,
        postal_code: fPostal || null,
        country:     fCountry,
      }
      if (editingAddr?.id) {
        await supabase.from('shipping_addresses').update(payload).eq('id', editingAddr.id)
      } else {
        await supabase.from('shipping_addresses').insert({ ...payload, user_id: user.id })
      }
      await loadShippingAddrs()
      setShowAddrForm(false)
      setEditingAddr(null)
    } finally {
      setSavingAddrForm(false)
    }
  }

  async function handleDeleteAddr(id: string) {
    if (!confirm('Supprimer cette adresse de livraison ?')) return
    setDeletingAddrId(id)
    try {
      const supabase = createClient()
      await supabase.from('shipping_addresses').delete().eq('id', id)
      await loadShippingAddrs()
    } finally {
      setDeletingAddrId(null)
    }
  }

  async function handleSetDefault(id: string) {
    const supabase = createClient()
    await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id)
    await loadShippingAddrs()
  }

  async function handleSaveVat() {
    setSavingVat(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({ vat_number: vatNumber || null }).eq('id', user.id)
      setVatSaved(true)
      setTimeout(() => setVatSaved(false), 2500)
    } finally {
      setSavingVat(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const restoreCart = (quote: QuoteItem) => {
    clearCart()
    const items: any[] = Array.isArray(quote.cart_items) ? quote.cart_items : []
    items.forEach(item => addItem(item))
    router.push('/panier')
  }

  const deleteQuote = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return
    setDeletingQuoteId(id)
    try {
      await fetch(`/api/cart-to-quote?id=${id}`, { method: 'DELETE' })
      setQuotes(prev => prev.filter(q => q.id !== id))
    } finally {
      setDeletingQuoteId(null)
    }
  }

  const isExpired = (q: QuoteItem) =>
    q.expires_at ? new Date(q.expires_at) < new Date() : false

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-slate-900 text-white pt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">MON COMPTE</p>
            <h1 className="text-2xl font-extrabold">{profile?.full_name || user.email}</h1>
            {profile?.company && <p className="text-slate-400 text-sm">{profile.company}</p>}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>

        {/* Tabs — dans le bandeau sombre */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 border-t border-slate-700/60">
          {(['commandes', 'devis', 'factures', 'profil'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
              }`}>
              {t === 'commandes'
                ? `Mes Commandes (${orders.length})`
                : t === 'devis'
                ? `Mes Devis (${quotes.length})`
                : t === 'factures'
                ? 'Mes Factures'
                : 'Mon Profil'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── COMMANDES ── */}
        {tab === 'commandes' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4">Vous n'avez pas encore de commande.</p>
                <Link href="/catalogue" className="bg-blue-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg inline-block">
                  Découvrir le catalogue
                </Link>
              </div>
            ) : (
              orders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                const isExpanded = expandedOrderId === order.id
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-slate-900">#{order.order_number}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-extrabold text-blue-600 text-lg">{formatPrice(order.total)}</p>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Suivi
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 pb-4">
                        <OrderProgressPanel orderId={order.id} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── DEVIS ── */}
        {tab === 'devis' && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4">Vous n'avez pas encore de devis sauvegardé.</p>
                <Link href="/panier" className="bg-blue-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg inline-block">
                  Aller au panier
                </Link>
              </div>
            ) : (
              quotes.map(quote => {
                const statusKey = isExpired(quote) ? 'expired' : (quote.status || 'draft')
                const cfg = QUOTE_STATUS_CONFIG[statusKey] || QUOTE_STATUS_CONFIG.draft
                const itemCount = Array.isArray(quote.cart_items) ? quote.cart_items.length : 0
                return (
                  <div key={quote.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <p className="font-bold text-slate-900">{quote.quote_number}</p>
                          {quote.reference && (
                            <span className="text-xs text-slate-500 font-medium">Réf : {quote.reference}</span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Créé le {formatDate(quote.created_at)}
                          {quote.expires_at && ` · Valide jusqu'au ${formatDate(quote.expires_at)}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                        {isExpired(quote) && (
                          <p className="text-xs text-orange-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ce devis a expiré
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="font-extrabold text-blue-600 text-lg">{formatPrice(quote.total)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => restoreCart(quote)}
                            className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Remettre en panier
                          </button>
                          <button
                            onClick={() => deleteQuote(quote.id)}
                            disabled={deletingQuoteId === quote.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Supprimer ce devis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── FACTURES ── */}
        {tab === 'factures' && <InvoicesTab />}

        {/* ── PROFIL ── */}
        {tab === 'profil' && (
          <div className="space-y-5 max-w-lg">

            {/* Infos de base (lecture seule) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Informations</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Email</dt><dd className="text-slate-700">{user.email}</dd></div>
                {profile?.full_name && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Nom</dt><dd className="text-slate-700">{profile.full_name}</dd></div>}
                {profile?.company && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Société</dt><dd className="text-slate-700">{profile.company}</dd></div>}
                {profile?.phone && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Téléphone</dt><dd className="text-slate-700">{profile.phone}</dd></div>}
              </dl>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Numéro de TVA</label>
                <p className="text-[11px] text-slate-400 mb-2">B2B — belge (BE0…) ou européen (FR…, NL…). La TVA 0% s'applique uniquement hors Belgique.</p>
                <div className="flex gap-2">
                  <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                    placeholder="BE0123456789 ou FR12345678901"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleSaveVat} disabled={savingVat}
                    className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                    {vatSaved ? '✓ Enregistré' : savingVat ? '…' : 'Sauver'}
                  </button>
                </div>
                {isBelgianVAT(vatNumber) && (
                  <p className="text-[11px] text-blue-700 mt-1.5 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Numéro TVA belge valide — TVA 21% applicable
                  </p>
                )}
                {isIntraCommunityVAT(vatNumber) && (
                  <p className="text-[11px] text-green-700 mt-1.5 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> TVA intracommunautaire — 0% appliqué sur vos commandes
                  </p>
                )}
                {vatNumber && !isValidVAT(vatNumber) && (
                  <p className="text-[11px] text-orange-600 mt-1.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Format non reconnu (ex : BE0123456789 ou FR12345678901)
                  </p>
                )}
              </div>
            </div>

            {/* Adresse de facturation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Adresse de facturation</h3>
              {(() => {
                const F = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{label}</label>
                    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )
                return (
                  <div className="space-y-3">
                    <F label="Rue et numéro" value={billingLine1} onChange={setBillingLine1} placeholder="Rue de Bruxelles 174h" />
                    <F label="Complément" value={billingLine2} onChange={setBillingLine2} placeholder="Bte 3…" />
                    <div className="grid grid-cols-3 gap-3">
                      <F label="Code postal" value={billingPostal} onChange={setBillingPostal} placeholder="4340" />
                      <div className="col-span-2"><F label="Ville" value={billingCity} onChange={setBillingCity} placeholder="Awans" /></div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Pays</label>
                      <select value={billingCountry} onChange={e => setBillingCountry(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })()}
              <div className="mt-4 flex justify-end">
                <button onClick={handleSaveAddresses} disabled={savingAddr}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                  {addrSaved ? '✓ Enregistrée' : savingAddr ? '…' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* Adresses de livraison */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Adresses de livraison</h3>

              {shippingAddrs.length === 0 && !showAddrForm ? (
                <p className="text-sm text-slate-400 mb-4">Aucune adresse de livraison enregistrée.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {shippingAddrs.map(addr => (
                    <div key={addr.id} className="flex items-start gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{addr.label}</span>
                          {addr.is_default && (
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Par défaut</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{addr.name}</p>
                        <p className="text-xs text-slate-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                        <p className="text-xs text-slate-500">{addr.postal_code} {addr.city} · {addr.country}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          disabled={addr.is_default}
                          title="Définir par défaut"
                          className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditAddrForm(addr)}
                          title="Modifier"
                          className="p-1.5 text-slate-300 hover:text-slate-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddr(addr.id)}
                          disabled={deletingAddrId === addr.id}
                          title="Supprimer"
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire inline */}
              {showAddrForm && (
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3 mb-4">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {editingAddr ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                  </p>
                  {(() => {
                    const F = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{label}</label>
                        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                    )
                    return (
                      <>
                        <F label="Libellé (ex. Bureau, Domicile)" value={fLabel} onChange={setFLabel} placeholder="Bureau" />
                        <F label="Nom du destinataire" value={fName} onChange={setFName} placeholder="Jean Dupont" />
                        <F label="Rue et numéro" value={fLine1} onChange={setFLine1} placeholder="Rue de la Livraison 1" />
                        <F label="Complément (optionnel)" value={fLine2} onChange={setFLine2} placeholder="Bte 2…" />
                        <div className="grid grid-cols-3 gap-3">
                          <F label="Code postal" value={fPostal} onChange={setFPostal} placeholder="4000" />
                          <div className="col-span-2"><F label="Ville" value={fCity} onChange={setFCity} placeholder="Liège" /></div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Pays</label>
                          <select value={fCountry} onChange={e => setFCountry(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setShowAddrForm(false); setEditingAddr(null) }}
                            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold px-4 py-2 text-sm rounded-lg transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveAddrForm}
                            disabled={savingAddrForm || !fLabel || !fName || !fLine1 || !fCity}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-lg transition-colors"
                          >
                            {savingAddrForm ? '…' : 'Enregistrer'}
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {!showAddrForm && (
                <button
                  onClick={openNewAddrForm}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Ajouter une adresse
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
