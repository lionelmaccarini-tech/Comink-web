'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Send, Save, X, Package, AlertCircle, Truck, Store, Zap, ChevronDown, Loader2, Eye, EyeOff, Lock, Package2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcDeliveryCost, type DeliverySettings } from '@/lib/utils'
import ClientPicker, { ClientData } from './ClientPicker'
import ProductLineModal from './ProductLineModal'
import DeliveryAddressPicker from './DeliveryAddressPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteLine {
  id: string
  description: string
  details?: string
  quantity: number
  unit_price_ht: number
  vat_rate: number
  // Catalog-product extras
  product_id?: string
  width_cm?: number
  height_cm?: number
  delai_days?: number
  delai_label?: string
  // Finitions structurées (pour reconstituion du panier)
  selectedFinitions?: Record<string, string | string[]>
  selectedDelai?: { id: string; days: number; label: string; surcharge_percent: number; is_express: boolean } | null
  selectedSides?: Record<string, string[]>
}

interface Vendeur { id: string; full_name: string; role: string }
interface Product {
  id: string
  name: string
  category?: string
  vat_rate?: number
  price_per_m2?: number
  price_flat?: number
  finitions?: any[]
  delai_options?: any[]
  sides_finitions?: any
  min_width_cm?: number
  min_height_cm?: number
}

interface Props {
  /** Provide for editing; omit for new quote */
  initialData?: any
}

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

const STAGE_OPTS = [
  { value: 'lead',        label: 'Lead' },
  { value: 'contacted',   label: 'Contacté' },
  { value: 'quoted',      label: 'Devis envoyé' },
  { value: 'negotiation', label: 'Négociation' },
  { value: 'won',         label: 'Gagné ✓' },
  { value: 'lost',        label: 'Perdu ✗' },
]

const SOURCE_OPTS = [
  { value: 'web',       label: 'Site web' },
  { value: 'phone',     label: 'Téléphone' },
  { value: 'email',     label: 'Email' },
  { value: 'referral',  label: 'Référence' },
  { value: 'event',     label: 'Salon / événement' },
  { value: 'other',     label: 'Autre' },
]

const DELIVERY_OPTS = [
  { value: 'pickup',  label: 'Enlèvement',    icon: Store,  desc: 'Le client vient chercher' },
  { value: 'parcel',  label: 'Colis standard', icon: Truck,  desc: 'Livraison postale' },
  { value: 'express', label: 'Express',         icon: Zap,    desc: 'Livraison rapide' },
]

// ── Delivery cost row ─────────────────────────────────────────────────────────

function DeliveryCostRow({
  auto, manual, value, onChange, onReset, hint,
}: {
  auto: number; manual: boolean; value: number
  onChange: (v: number) => void; onReset: () => void; hint?: string
}) {
  const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs text-slate-500 font-medium">Frais de livraison HT</label>
        {manual && (
          <button type="button" onClick={onReset}
            className="text-xs text-blue-600 hover:underline">
            Réinitialiser ({fmt(auto)})
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-44">
          <input type="number" min={0} step={0.01} value={value}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
        </div>
        {!manual && auto > 0 && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">calculé auto</span>
        )}
        {manual && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">modifié</span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuoteEditor({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData

  // Client (managed by ClientPicker)
  const [client, setClient] = useState<ClientData>({
    id:                  initialData?.user_id              ?? undefined,
    full_name:           initialData?.client_name          ?? '',
    email:               initialData?.client_email         ?? '',
    company:             initialData?.client_company       ?? '',
    phone:               initialData?.client_phone         ?? '',
    vat_number:          initialData?.vat_number           ?? '',
    billing_line1:       initialData?.billing_line1        ?? '',
    billing_line2:       initialData?.billing_line2        ?? '',
    billing_city:        initialData?.billing_city         ?? '',
    billing_postal_code: initialData?.billing_postal_code  ?? '',
    billing_country:     initialData?.billing_country      ?? 'BE',
  })
  const [reference, setReference] = useState(initialData?.reference ?? '')

  // Lines
  const defaultLine = (): QuoteLine => ({
    id: crypto.randomUUID(), description: '', details: '', quantity: 1, unit_price_ht: 0, vat_rate: 21,
  })
  const [lines, setLines] = useState<QuoteLine[]>(
    initialData?.items?.length ? initialData.items : [defaultLine()]
  )

  // Delivery
  const [deliveryMethod,    setDeliveryMethod]    = useState<'pickup' | 'parcel' | 'express'>(initialData?.delivery_method ?? 'pickup')
  const [deliveryCost,      setDeliveryCost]      = useState<number>(initialData?.delivery_cost ?? 0)
  const [deliveryCostAuto,  setDeliveryCostAuto]  = useState<number>(0)
  const [deliveryCostManual, setDeliveryCostManual] = useState<boolean>(false)
  const [deliveryCountry,   setDeliveryCountry]   = useState<string>(initialData?.delivery_country ?? 'BE')
  const [deliveryAddress,   setDeliveryAddress]   = useState<string>(initialData?.delivery_address ?? '')
  const [deliveryKm,        setDeliveryKm]        = useState<number | null>(null)
  const [calcKmLoading,     setCalcKmLoading]     = useState(false)
  const [calcKmError,       setCalcKmError]       = useState('')
  const [blindShipping,     setBlindShipping]      = useState<boolean>(initialData?.blind_shipping ?? false)
  const [deliverySettings,  setDeliverySettings]  = useState<DeliverySettings | null>(null)
  const [atelierAddress,    setAtelierAddress]    = useState('')

  // CRM
  const [stage,      setStage]      = useState(initialData?.pipeline_stage   ?? 'lead')
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to      ?? '')
  const [prob,       setProb]       = useState(initialData?.probability       ?? 20)
  const [source,     setSource]     = useState(initialData?.source            ?? 'web')
  const [nextDate,   setNextDate]   = useState(initialData?.next_action_date  ?? '')
  const [nextNote,   setNextNote]   = useState(initialData?.next_action_note  ?? '')
  const [lostReason, setLostReason] = useState(initialData?.lost_reason       ?? '')
  const [validUntil, setValidUntil] = useState(initialData?.valid_until       ?? '')
  const [notes,      setNotes]      = useState(initialData?.notes             ?? '')
  const [status,     setStatus]     = useState(initialData?.status            ?? 'draft')

  // UI state
  const [vendeurs,      setVendeurs]      = useState<Vendeur[]>([])
  const [products,      setProducts]      = useState<Product[]>([])
  const [showPicker,    setShowPicker]    = useState(false)
  const [pickerSearch,  setPickerSearch]  = useState('')
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [sending,       setSending]       = useState(false)
  const [error,         setError]         = useState('')
  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // ── Init: load user, vendeurs, products, settings ──────────────────────────
  useEffect(() => {
    // Load vendeurs
    fetch('/api/crm/vendeurs')
      .then(r => r.json())
      .then(d => setVendeurs(Array.isArray(d) ? d : []))

    // Load products (full detail for modal)
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))

    // Load current user + role + auto-assign
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      if (!isEdit) setAssignedTo(user.id)
      // Also fetch role so we can restrict certain fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setCurrentUserRole(profile?.role ?? null)
    })

    // Load quote validity + delivery settings in one call
    fetch('/api/settings/payment-delivery')
      .then(r => r.json())
      .then(cfg => {
        const ds = cfg?.delivery
        if (ds) {
          setDeliverySettings({
            parcel_be_min:  ds.parcel_be_min,
            parcel_eu_min:  ds.parcel_eu_min,
            parcel_percent: ds.parcel_percent,
            express_min:    ds.express_min,
            express_per_km: ds.express_per_km,
          })
          if (ds.atelier_address) setAtelierAddress(ds.atelier_address)
        }
      })
      .catch(() => {})

    if (!isEdit) {
      fetch('/api/admin/settings')
        .then(r => r.json())
        .then(settings => {
          const days = parseInt(settings?.quote_validity_days ?? '30', 10)
          if (!isNaN(days) && days > 0) {
            const d = new Date()
            d.setDate(d.getDate() + days)
            setValidUntil(d.toISOString().split('T')[0])
          }
        })
        .catch(() => {
          const d = new Date()
          d.setDate(d.getDate() + 30)
          setValidUntil(d.toISOString().split('T')[0])
        })
    }
  }, [isEdit])

  // ── Auto-compute delivery cost when inputs change ──────────────────────────
  useEffect(() => {
    if (!deliverySettings || deliveryMethod === 'pickup') {
      setDeliveryCostAuto(0)
      if (!deliveryCostManual) setDeliveryCost(0)
      return
    }
    const linesTotal = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0)
    const km = deliveryKm ?? 0
    const auto = calcDeliveryCost(deliveryMethod, linesTotal, deliveryCountry, km, deliverySettings)
    setDeliveryCostAuto(auto)
    if (!deliveryCostManual) setDeliveryCost(auto)
  }, [deliveryMethod, lines, deliveryCountry, deliveryKm, deliverySettings, deliveryCostManual])

  // ── Distance calculator (express) ─────────────────────────────────────────
  const calcDistance = useCallback(async () => {
    if (!deliveryAddress.trim() || !atelierAddress) return
    setCalcKmLoading(true); setCalcKmError('')
    try {
      const res  = await fetch('/api/utils/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: atelierAddress, destination: deliveryAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Impossible de calculer la distance')
      setDeliveryKm(data.km ?? null)
    } catch (e: any) {
      setCalcKmError(e.message)
    } finally {
      setCalcKmLoading(false)
    }
  }, [deliveryAddress, atelierAddress])

  // ── Computed totals ──────────────────────────────────────────────────────────
  const subtotalLines = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0)
  const subtotal = subtotalLines + (deliveryMethod !== 'pickup' ? deliveryCost : 0)

  // Group VAT by rate
  const vatGroups = lines.reduce<Record<number, number>>((acc, l) => {
    const rate = l.vat_rate
    acc[rate] = (acc[rate] ?? 0) + l.quantity * l.unit_price_ht * rate / 100
    return acc
  }, {})
  // Add delivery VAT (21%)
  if (deliveryMethod !== 'pickup' && deliveryCost > 0) {
    vatGroups[21] = (vatGroups[21] ?? 0) + deliveryCost * 0.21
  }

  const tax   = Object.values(vatGroups).reduce((s, v) => s + v, 0)
  const total = subtotal + tax

  // ── Line helpers ─────────────────────────────────────────────────────────────
  const updateLine = (id: string, patch: Partial<QuoteLine>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))
  const addLine    = () => setLines(prev => [...prev, defaultLine()])

  // When a catalog product is clicked → open configuration modal
  const openProductModal = (p: Product) => {
    setPendingProduct(p)
    setShowPicker(false)
    setPickerSearch('')
  }

  // When modal confirms → add line
  const handleModalConfirm = (line: QuoteLine) => {
    setLines(prev => [...prev, line])
    setPendingProduct(null)
  }

  // ── Save / Send ──────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    client_name:          client.full_name,
    client_email:         client.email,
    client_company:       client.company             || null,
    client_phone:         client.phone               || null,
    vat_number:           client.vat_number          || null,
    billing_line1:        client.billing_line1        || null,
    billing_line2:        client.billing_line2        || null,
    billing_city:         client.billing_city         || null,
    billing_postal_code:  client.billing_postal_code  || null,
    billing_country:      client.billing_country       || null,
    user_id:              client.id                   || null,
    reference:         reference         || null,
    items:             lines,
    delivery_method:   deliveryMethod,
    delivery_cost:     deliveryMethod !== 'pickup' ? deliveryCost : 0,
    delivery_country:  deliveryCountry,
    delivery_address:  deliveryAddress || null,
    delivery_km:       deliveryKm,
    blind_shipping:    blindShipping,
    subtotal:          Math.round(subtotal * 100) / 100,
    tax:               Math.round(tax     * 100) / 100,
    total:             Math.round(total   * 100) / 100,
    pipeline_stage:    stage,
    assigned_to:       assignedTo || null,
    probability:       prob,
    expected_amount:   Math.round(total * 100) / 100,
    source,
    next_action_date:  nextDate    || null,
    next_action_note:  nextNote    || null,
    lost_reason:       lostReason  || null,
    valid_until:       validUntil  || null,
    notes:             notes       || null,
    created_by:        currentUserId || null,
    status,
  })

  const handleSave = async () => {
    if (!client.full_name || !client.email) { setError('Veuillez sélectionner ou créer un client'); return }
    setError(''); setSaving(true)
    try {
      const url    = isEdit ? `/api/crm/quotes/${initialData.id}` : '/api/crm/quotes'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      router.push(`/crm/quotes/${data.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!client.full_name || !client.email) { setError('Veuillez sélectionner ou créer un client'); return }
    if (!isEdit) {
      // Save first, then redirect to the quote for sending
      setError(''); setSaving(true)
      try {
        const res  = await fetch('/api/crm/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur')
        // Now send it
        const sendRes = await fetch(`/api/crm/quotes/${data.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent_by: currentUserId }),
        })
        if (!sendRes.ok) throw new Error('Erreur lors de l\'envoi')
        setStatus('sent')
        router.push(`/crm/quotes/${data.id}?sent=1`)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setSaving(false)
      }
      return
    }
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/crm/quotes/${initialData.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent_by: currentUserId }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      setStatus('sent')
      router.push(`/crm/quotes/${initialData.id}?sent=1`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const filteredProducts = products.filter(p =>
    !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  const statusBadge = status === 'sent'
    ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">● Devis envoyé</span>
    : <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">● Brouillon</span>

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Product configuration modal */}
      {pendingProduct && (
        <ProductLineModal
          product={pendingProduct}
          onConfirm={handleModalConfirm}
          onClose={() => setPendingProduct(null)}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left / main — 2 cols */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status badge */}
          <div className="flex items-center gap-3">
            {statusBadge}
            {isEdit && initialData?.quote_number && (
              <span className="text-sm text-slate-500 font-mono">{initialData.quote_number}</span>
            )}
          </div>

          {/* Client */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Client</h2>
            <ClientPicker
              value={client}
              onChange={setClient}
              vendeurName={vendeurs.find(v => v.id === assignedTo)?.full_name}
              vendeurId={assignedTo || currentUserId || undefined}
            />
            {/* Billing address + reference — always visible once client is selected */}
            {client.email && (
              <>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span>📍</span> Adresse de facturation
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Rue / ligne 1</label>
                      <input
                        value={client.billing_line1 || ''}
                        onChange={e => setClient(c => ({ ...c, billing_line1: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Rue de la Paix 12" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Complément (optionnel)</label>
                      <input
                        value={client.billing_line2 || ''}
                        onChange={e => setClient(c => ({ ...c, billing_line2: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Bte 3, Bâtiment B…" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Code postal</label>
                      <input
                        value={client.billing_postal_code || ''}
                        onChange={e => setClient(c => ({ ...c, billing_postal_code: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="4000" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Ville</label>
                      <input
                        value={client.billing_city || ''}
                        onChange={e => setClient(c => ({ ...c, billing_city: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Liège" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Pays</label>
                      <select
                        value={client.billing_country || 'BE'}
                        onChange={e => setClient(c => ({ ...c, billing_country: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="BE">Belgique</option>
                        <option value="FR">France</option>
                        <option value="LU">Luxembourg</option>
                        <option value="NL">Pays-Bas</option>
                        <option value="DE">Allemagne</option>
                        <option value="GB">Royaume-Uni</option>
                        <option value="CH">Suisse</option>
                        <option value="ES">Espagne</option>
                        <option value="IT">Italie</option>
                        <option value="PT">Portugal</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs text-slate-500 mb-1">Référence client (optionnel)</label>
                  <input value={reference} onChange={e => setReference(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PO-2026-001" />
                </div>
              </>
            )}
          </div>

          {/* Lines */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Lignes du devis</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowPicker(v => !v)}
                  className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Package className="w-3.5 h-3.5" /> Produit catalogue
                </button>
                <button onClick={addLine}
                  className="flex items-center gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Ligne libre
                </button>
              </div>
            </div>

            {/* Product picker */}
            {showPicker && (
              <div className="mb-4 border border-blue-200 rounded-xl bg-blue-50/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rechercher un produit..." autoFocus />
                  <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.slice(0, 20).map(p => (
                    <button key={p.id} onClick={() => openProductModal(p)}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-white transition-colors flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-slate-800">{p.name}</span>
                        {p.category && <span className="ml-2 text-xs text-slate-400">{p.category}</span>}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 -rotate-90" />
                    </button>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Aucun produit trouvé</p>}
                </div>
              </div>
            )}

            {/* Line headers */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-slate-400 font-medium uppercase px-1 mb-2">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Qté</div>
              <div className="col-span-2 text-right">P.U. HT</div>
              <div className="col-span-1 text-center">TVA</div>
              <div className="col-span-1 text-right">Total HT</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                // Catalogue lines are locked in edit mode — only qty is editable
                const isCatalogueLocked = isEdit && !!line.product_id
                return (
                  <div key={line.id} className={`border rounded-lg p-3 ${isCatalogueLocked ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200'}`}>
                    {isCatalogueLocked && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Ligne catalogue — modifiable : quantité uniquement. Pour changer les specs, supprimez et recréez la ligne.</span>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-12 gap-2 items-start">
                      {/* Description */}
                      <div className="sm:col-span-5">
                        {isCatalogueLocked ? (
                          <div className="px-2.5 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-lg border border-slate-200">
                            {line.description || `Ligne ${idx + 1}`}
                          </div>
                        ) : (
                          <input value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Ligne ${idx + 1}`} />
                        )}
                        {isCatalogueLocked ? (
                          line.details && (
                            <div className="px-2.5 py-1 text-xs text-slate-500 bg-slate-100 rounded-lg border border-slate-200 mt-1">
                              {line.details}
                            </div>
                          )
                        ) : (
                          <input value={line.details || ''} onChange={e => updateLine(line.id, { details: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white mt-1 text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            placeholder="Détails (dimensions, finitions...)" />
                        )}
                      </div>
                      {/* Qty — always editable */}
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-slate-400 mb-1 block">Qté</label>
                        <input type="number" min={1} value={line.quantity} onChange={e => updateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${isCatalogueLocked ? 'border-blue-300 bg-blue-50 font-semibold' : 'border-slate-200 bg-white'}`} />
                      </div>
                      {/* Unit price */}
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-slate-400 mb-1 block">P.U. HT (€)</label>
                        {isCatalogueLocked ? (
                          <div className="px-2.5 py-1.5 text-sm text-right text-slate-600 bg-slate-100 rounded-lg border border-slate-200">
                            {fmt(line.unit_price_ht)}
                          </div>
                        ) : (
                          <input type="number" min={0} step={0.01} value={line.unit_price_ht} onChange={e => updateLine(line.id, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        )}
                      </div>
                      {/* VAT */}
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-xs text-slate-400 mb-1 block">TVA %</label>
                        {isCatalogueLocked ? (
                          <div className="px-1.5 py-1.5 text-sm text-center text-slate-600 bg-slate-100 rounded-lg border border-slate-200">
                            {line.vat_rate}%
                          </div>
                        ) : (
                          <select value={line.vat_rate} onChange={e => updateLine(line.id, { vat_rate: Number(e.target.value) })}
                            className="w-full border border-slate-200 rounded-lg px-1.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={0}>0%</option>
                            <option value={6}>6%</option>
                            <option value={21}>21%</option>
                          </select>
                        )}
                      </div>
                      {/* Total */}
                      <div className="sm:col-span-1 flex items-center justify-end">
                        <span className="text-sm font-semibold text-slate-700">
                          {fmt(line.quantity * line.unit_price_ht)}
                        </span>
                      </div>
                      {/* Delete */}
                      <div className="sm:col-span-1 flex items-center justify-end">
                        <button onClick={() => removeLine(line.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={addLine}
              className="mt-3 w-full border border-dashed border-slate-300 rounded-lg py-2.5 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Mode de livraison</h2>

            {/* Method cards */}
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {DELIVERY_OPTS.map(opt => {
                const Icon = opt.icon
                const active = deliveryMethod === opt.value
                return (
                  <button key={opt.value} type="button"
                    onClick={() => { setDeliveryMethod(opt.value as any); setDeliveryCostManual(false) }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium
                      ${active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                    <span className={`text-xs font-normal ${active ? 'text-blue-500' : 'text-slate-400'}`}>{opt.desc}</span>
                  </button>
                )
              })}
            </div>

            {/* Parcel options */}
            {deliveryMethod === 'parcel' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Adresse de livraison</label>
                  <DeliveryAddressPicker
                    clientId={client.id}
                    value={deliveryAddress}
                    onChange={addr => { setDeliveryAddress(addr); setDeliveryCostManual(false) }}
                    onCountryChange={c => { setDeliveryCountry(c); setDeliveryCostManual(false) }}
                  />
                </div>
                <DeliveryCostRow
                  auto={deliveryCostAuto}
                  manual={deliveryCostManual}
                  value={deliveryCost}
                  onChange={v => { setDeliveryCost(v); setDeliveryCostManual(true) }}
                  onReset={() => { setDeliveryCostManual(false); setDeliveryCost(deliveryCostAuto) }}
                  hint={deliverySettings
                    ? `${deliverySettings.parcel_percent}% du HT, min. ${deliveryCountry === 'BE' ? deliverySettings.parcel_be_min : deliverySettings.parcel_eu_min}€`
                    : undefined}
                />
              </div>
            )}

            {/* Express options */}
            {deliveryMethod === 'express' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Adresse de livraison</label>
                  <DeliveryAddressPicker
                    clientId={client.id}
                    value={deliveryAddress}
                    onChange={addr => { setDeliveryAddress(addr); setDeliveryKm(null); setDeliveryCostManual(false) }}
                    onCountryChange={c => { setDeliveryCountry(c) }}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <button type="button" onClick={calcDistance} disabled={calcKmLoading || !deliveryAddress.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
                    {calcKmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>📍</span>}
                    Calculer la distance
                  </button>
                  {calcKmError && <p className="text-xs text-red-500">{calcKmError}</p>}
                  {deliveryKm !== null && !calcKmError && (
                    <p className="text-xs text-slate-500">Distance : <strong>{deliveryKm} km</strong></p>
                  )}
                </div>
                <DeliveryCostRow
                  auto={deliveryCostAuto}
                  manual={deliveryCostManual}
                  value={deliveryCost}
                  onChange={v => { setDeliveryCost(v); setDeliveryCostManual(true) }}
                  onReset={() => { setDeliveryCostManual(false); setDeliveryCost(deliveryCostAuto) }}
                  hint={deliverySettings && deliveryKm !== null
                    ? `${deliveryKm} km × ${deliverySettings.express_per_km}€/km, min. ${deliverySettings.express_min}€`
                    : deliveryKm === null ? 'Calculez la distance pour obtenir un tarif' : undefined}
                />
              </div>
            )}

            {/* Blind shipping — shown for any non-pickup */}
            {deliveryMethod !== 'pickup' && (
              <label className="mt-4 flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input type="checkbox" checked={blindShipping} onChange={e => setBlindShipping(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    {blindShipping ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    Expédition à l'aveugle
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Le colis sera expédié sous le nom du client — le nom Comink n'apparaîtra pas sur l'emballage.
                  </p>
                </div>
              </label>
            )}

            {deliveryMethod !== 'pickup' && (
              <p className="text-xs text-slate-400 mt-3">TVA 21% appliquée sur les frais de livraison</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Remarques / Conditions</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Conditions particulières, délais de livraison, remarques pour le client..." />
          </div>

        </div>

        {/* Right sidebar — 1 col */}
        <div className="space-y-5">

          {/* Totals */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-20">
            <h2 className="font-semibold text-slate-800 mb-4">Récapitulatif</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Produits HT</span>
                <span className="font-medium">{fmt(subtotalLines)}</span>
              </div>
              {deliveryMethod !== 'pickup' && deliveryCost > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Livraison HT</span>
                  <span>{fmt(deliveryCost)}</span>
                </div>
              )}
              {Object.entries(vatGroups).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between text-slate-500">
                  <span>TVA {rate}%</span>
                  <span>{fmt(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                <span>Total TTC</span>
                <span className="text-blue-600">{fmt(total)}</span>
              </div>
            </div>

            {/* Validity — read-only for vendeur, editable for admin/collaborateur */}
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-1">
                <label className="block text-xs text-slate-500">Validité du devis</label>
                {currentUserRole === 'vendeur' && (
                  <span title="Modifiable uniquement par un administrateur"><Lock className="w-3 h-3 text-slate-400" /></span>
                )}
              </div>
              {currentUserRole === 'vendeur' ? (
                <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 flex items-center justify-between">
                  <span>{validUntil ? new Date(validUntil).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                </div>
              ) : (
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 space-y-2">
              <button onClick={handleSend} disabled={sending || saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 text-sm">
                <Send className="w-4 h-4" />
                {sending || saving ? 'En cours...' : 'Envoyer au client'}
              </button>
              <button onClick={handleSave} disabled={saving || sending}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 text-sm">
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Sauvegarder brouillon'}
              </button>
            </div>
          </div>

          {/* CRM Fields */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Infos CRM</h2>
            <div className="space-y-3">

              <div>
                <label className="block text-xs text-slate-500 mb-1">Stade pipeline</label>
                <select value={stage} onChange={e => setStage(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STAGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {stage === 'lost' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Raison de la perte</label>
                  <input value={lostReason} onChange={e => setLostReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Prix, délai, concurrent..." />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">Probabilité</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} step={5} value={prob} onChange={e => setProb(Number(e.target.value))}
                    className="flex-1 accent-blue-600" />
                  <span className="text-sm font-bold text-slate-700 w-10 text-right">{prob}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Assigné à</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Non assigné —</option>
                  {vendeurs.map(v => (
                    <option key={v.id} value={v.id}>{v.full_name} ({v.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Source</label>
                <select value={source} onChange={e => setSource(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SOURCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Prochaine action</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
                <input value={nextNote} onChange={e => setNextNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Rappeler pour suivi..." />
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  )
}
