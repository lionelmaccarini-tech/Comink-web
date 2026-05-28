'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Plus, Trash2, Upload, FileText, Loader2, ChevronDown,
  ChevronUp, User, Mail, Hash, MessageSquare, CheckCircle, AlertCircle,
  Package, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FileAnalysisResult, { type AnalysisResult } from '@/components/crm/FileAnalysisResult'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinitionOption {
  id: string; label: string
  price_type: 'fixed' | 'percent' | 'per_m2'; price_supplement: number
  default_selected: boolean
}
interface FinitionGroup {
  id: string; label: string
  display_type: 'checkbox' | 'select'; required: boolean
  options: FinitionOption[]
}
interface ProductInfo {
  id: string; name: string; category: string
  product_type: 'sur_mesure' | 'taille_standard'
  price_per_m2?: number
  standard_sizes?: Array<{ label: string; width_cm: number; height_cm: number; price: number }>
  finitions?: any[]; delai_options?: any[]; sides_finitions?: any
  production_code?: string; vat_rate?: number; available: boolean
}
interface FileInfo { url: string; name: string; thumb?: string }
interface OrderLine {
  id: string
  product_id: string
  width_cm: number | ''
  height_cm: number | ''
  quantity: number
  selectedFinitions: Record<string, string | string[]>
  selectedDelai: any
  selectedSides: Record<string, string[]>
  expanded: boolean
  file: FileInfo | null
  uploading: boolean
  analysis: AnalysisResult | null
  analysing: boolean
}

const ORDER_SOURCES = [
  { id: 'email',         label: 'Email reçu',       icon: '📧' },
  { id: 'phone',         label: 'Téléphone',         icon: '📞' },
  { id: 'walk_in',       label: 'Sur place',         icon: '🚶' },
  { id: 'collaborateur', label: 'Collaboratrice',    icon: '👩‍💼' },
  { id: 'autre',         label: 'Autre',             icon: '📋' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeFinitions(raw: any[]): FinitionGroup[] {
  if (!raw?.length) return []
  if (raw[0]?.options !== undefined) return raw as FinitionGroup[]
  return raw.map((f: any) => ({
    id: f.id ?? Math.random().toString(36).slice(2),
    label: f.name ?? '',
    display_type: f.display_type === 'select' ? 'select' : 'checkbox',
    required: false,
    options: [{
      id: (f.id ?? '') + '_opt', label: f.name ?? '',
      price_type: f.price_type ?? 'fixed', price_supplement: f.price_supplement ?? 0,
      default_selected: f.default_selected ?? false,
    }],
  }))
}

function initLineConfig(p: ProductInfo): Pick<OrderLine, 'selectedFinitions' | 'selectedDelai' | 'selectedSides'> {
  const finitionGroups = normalizeFinitions(p.finitions ?? [])
  const delais: any[] = [...(p.delai_options ?? [])].sort((a, b) => a.days - b.days)
  const sf = p.sides_finitions

  const selectedFinitions: Record<string, string | string[]> = {}
  finitionGroups.forEach(g => {
    selectedFinitions[g.id] = g.display_type === 'select'
      ? (g.options.find(o => o.default_selected)?.id ?? '')
      : g.options.filter(o => o.default_selected).map(o => o.id)
  })

  const selectedDelai = delais[0] ?? null

  const selectedSides: Record<string, string[]> = {}
  if (sf?.enabled && sf.sides?.length) {
    const firstOptId = sf.options?.[0]?.id ?? ''
    sf.sides.forEach((s: any) => { selectedSides[s.id] = firstOptId ? [firstOptId] : [] })
  }
  return { selectedFinitions, selectedDelai, selectedSides }
}

let _lid = 0
function lineId() { return `line_${++_lid}_${Date.now()}` }
function emptyLine(): OrderLine {
  return {
    id: lineId(), product_id: '', width_cm: '', height_cm: '', quantity: 1,
    selectedFinitions: {}, selectedDelai: null, selectedSides: {},
    expanded: true, file: null, uploading: false, analysis: null, analysing: false,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onCreated: (orderNumber: string) => void
}

export default function NewOrderModal({ onClose, onCreated }: Props) {
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Client info
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [reference,   setReference]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [source,      setSource]      = useState('email')

  // Lines
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()])

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load products
  useEffect(() => {
    fetch('/api/admin/products?available=true')
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : (data.products ?? [])))
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [])

  // ── Line manipulation ────────────────────────────────────────────────────────

  function getProduct(id: string) { return products.find(p => p.id === id) }

  function updateLine(id: string, patch: Partial<OrderLine>) {
    setLines(ls => ls.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      if (patch.product_id !== undefined && patch.product_id !== l.product_id) {
        const p = getProduct(patch.product_id)
        if (p) return { ...updated, ...initLineConfig(p) }
        return { ...updated, selectedFinitions: {}, selectedDelai: null, selectedSides: {} }
      }
      return updated
    }))
  }

  // ── File upload + analysis ────────────────────────────────────────────────────

  const handleUpload = useCallback(async (lineId: string, file: File) => {
    updateLine(lineId, { uploading: true, analysis: null, analysing: false })
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('itemId', `prod-${lineId}`)
      const res = await fetch('/api/r2-upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload échoué')
      const data = await res.json()
      const fileInfo: FileInfo = { url: data.url, name: data.name, thumb: data.url }
      updateLine(lineId, { file: fileInfo, uploading: false, analysing: true })

      // Auto-analyze
      const line = lines.find(l => l.id === lineId)
      const prod = line ? getProduct(line.product_id) : undefined
      const dims = line?.width_cm && line?.height_cm
        ? `${line.width_cm} × ${line.height_cm} cm` : undefined

      const analyzeRes = await fetch('/api/crm/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: data.url,
          file_name: data.name,
          product_name: prod?.name,
          dimensions: dims,
        }),
      })
      const result = await analyzeRes.json()
      updateLine(lineId, { analysing: false, analysis: result.error ? null : result })
    } catch (e: any) {
      updateLine(lineId, { uploading: false, analysing: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, products])

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError('')

    // Validation
    if (!clientName.trim()) { setError('Le nom du client est requis'); return }
    if (!clientEmail.trim()) { setError("L'email du client est requis"); return }
    const incomplete = lines.find(l => !l.product_id)
    if (incomplete) { setError('Sélectionnez un produit pour chaque ligne'); return }

    setSubmitting(true)
    try {
      const items = lines.map(l => {
        const p = getProduct(l.product_id)!
        return {
          product: {
            id: p.id, name: p.name, category: p.category,
            production_code: p.production_code ?? null,
            vat_rate: p.vat_rate ?? 21,
          },
          product_id: p.id,
          quantity: l.quantity,
          width_cm:  p.product_type === 'sur_mesure' ? Number(l.width_cm)  || null : null,
          height_cm: p.product_type === 'sur_mesure' ? Number(l.height_cm) || null : null,
          unit_price: 0,
          selectedFinitions: l.selectedFinitions,
          selectedDelai:     l.selectedDelai,
          selectedSides:     l.selectedSides,
          file_url:    l.file?.url   ?? null,
          file_name:   l.file?.name  ?? null,
          file_thumb:  l.file?.thumb ?? null,
          file_analysis: l.analysis ?? null,
          // Source note
          _source: source,
          _notes: notes.trim() || null,
        }
      })

      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          billing:        { name: clientName.trim(), email: clientEmail.trim() },
          delivery_method: 'pickup',
          delivery_cost:  0,
          orderReference: reference.trim() || null,
          source,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur serveur')
      onCreated(data.order_number)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création')
      setSubmitting(false)
    }
  }

  const surMesure = products.filter(p => p.product_type === 'sur_mesure')
  const standard  = products.filter(p => p.product_type === 'taille_standard')

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Nouvelle commande</h2>
              <p className="text-xs text-slate-400">Commande reçue par mail ou téléphone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">

          {/* ── Left panel : client info ──────────────────────────────────────── */}
          <div className="lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-6 space-y-4">

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Client</p>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Nom du client *"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    placeholder="Email *"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" value={reference} onChange={e => setReference(e.target.value)}
                    placeholder="Référence client (optionnel)"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Source */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source de la commande</p>
              <div className="grid grid-cols-1 gap-1.5">
                {ORDER_SOURCES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all text-left',
                      source === s.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Notes internes
              </label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Instructions de production, remarques…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* ── Right panel : product lines ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Lignes de production ({lines.length})
              </p>
              <button
                onClick={() => setLines(ls => [...ls, emptyLine()])}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
              </button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center h-24 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Chargement des produits…
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    idx={idx}
                    surMesure={surMesure}
                    standard={standard}
                    getProduct={getProduct}
                    updateLine={updateLine}
                    handleUpload={handleUpload}
                    fileRefs={fileRefs}
                    canRemove={lines.length > 1}
                    onRemove={() => setLines(ls => ls.filter(l => l.id !== line.id))}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours…</>
              : <><Zap className="w-4 h-4" /> Créer et envoyer en production</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LineRow subcomponent ───────────────────────────────────────────────────────

interface LineRowProps {
  line: OrderLine
  idx: number
  surMesure: ProductInfo[]
  standard: ProductInfo[]
  getProduct: (id: string) => ProductInfo | undefined
  updateLine: (id: string, patch: Partial<OrderLine>) => void
  handleUpload: (lineId: string, file: File) => void
  fileRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  canRemove: boolean
  onRemove: () => void
}

function LineRow({
  line, idx, surMesure, standard, getProduct,
  updateLine, handleUpload, fileRefs, canRemove, onRemove,
}: LineRowProps) {
  const product = getProduct(line.product_id)
  const finitionGroups = normalizeFinitions(product?.finitions ?? [])
  const delais: any[] = [...(product?.delai_options ?? [])].sort((a, b) => a.days - b.days)
  const sf = product?.sides_finitions
  const hasSides = sf?.enabled && (sf.sides?.length ?? 0) > 0
  const hasOptions = finitionGroups.length > 0 || delais.length > 0 || hasSides

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">

      {/* Line header */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </span>

        {/* Product select */}
        <div className="flex-1 relative">
          <select
            value={line.product_id}
            onChange={e => updateLine(line.id, { product_id: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Choisir un produit —</option>
            {surMesure.length > 0 && (
              <optgroup label="Sur mesure">
                {surMesure.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
            {standard.length > 0 && (
              <optgroup label="Taille standard">
                {standard.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Dimensions (sur mesure only) */}
        {product?.product_type === 'sur_mesure' && (
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" step="0.1"
              value={line.width_cm} onChange={e => updateLine(line.id, { width_cm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="L cm"
              className="w-20 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-xs">×</span>
            <input
              type="number" min="1" step="0.1"
              value={line.height_cm} onChange={e => updateLine(line.id, { height_cm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="H cm"
              className="w-20 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Standard size select */}
        {product?.product_type === 'taille_standard' && (product.standard_sizes?.length ?? 0) > 0 && (
          <div className="relative">
            <select
              value={`${line.width_cm}x${line.height_cm}`}
              onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number)
                updateLine(line.id, { width_cm: w, height_cm: h })
              }}
              className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="x">— Format —</option>
              {product.standard_sizes!.map(s => (
                <option key={s.label} value={`${s.width_cm}x${s.height_cm}`}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Qty */}
        <input
          type="number" min="1"
          value={line.quantity} onChange={e => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value)) })}
          className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Quantité"
        />

        {/* Toggle options */}
        {hasOptions && (
          <button
            onClick={() => updateLine(line.id, { expanded: !line.expanded })}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
            title="Options & délai"
          >
            {line.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Remove */}
        {canRemove && (
          <button onClick={onRemove} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Options panel */}
      {line.expanded && hasOptions && product && (
        <OptionsPanel line={line} product={product} finitionGroups={finitionGroups} delais={delais} sf={sf} updateLine={updateLine} />
      )}

      {/* File upload + analysis */}
      <div className="p-3 space-y-2">
        {line.file ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-emerald-700 truncate flex-1 text-xs">{line.file.name}</span>
            <button
              onClick={() => updateLine(line.id, { file: null, analysis: null })}
              className="text-emerald-500 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRefs.current[line.id]?.click()}
            disabled={line.uploading}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg py-2.5 text-xs text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {line.uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload en cours…</>
              : <><Upload className="w-4 h-4" /> Déposer le fichier client (PDF, JPG, PNG…)</>
            }
          </button>
        )}
        <input
          type="file"
          className="hidden"
          ref={el => { fileRefs.current[line.id] = el }}
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.ai,.eps"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(line.id, f) }}
        />

        <FileAnalysisResult result={line.analysis} loading={line.analysing} />
      </div>
    </div>
  )
}

// ── OptionsPanel ──────────────────────────────────────────────────────────────

function OptionsPanel({ line, product, finitionGroups, delais, sf, updateLine }: {
  line: OrderLine; product: ProductInfo
  finitionGroups: FinitionGroup[]; delais: any[]; sf: any
  updateLine: (id: string, patch: Partial<OrderLine>) => void
}) {
  const hasSides = sf?.enabled && (sf.sides?.length ?? 0) > 0

  return (
    <div className="px-4 pb-4 pt-3 bg-blue-50/50 border-t border-blue-100 space-y-4">

      {/* Délai */}
      {delais.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Délai de production</p>
          <div className="flex flex-wrap gap-1.5">
            {delais.map((d: any) => (
              <button
                key={d.id ?? d.days}
                onClick={() => updateLine(line.id, { selectedDelai: d })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                  line.selectedDelai?.days === d.days
                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                {d.label}
                {d.surcharge_percent ? ` (+${d.surcharge_percent}%)` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Finitions */}
      {finitionGroups.map(g => {
        const sel = line.selectedFinitions[g.id]
        return (
          <div key={g.id}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{g.label}</p>
            {g.display_type === 'select' ? (
              <div className="relative max-w-xs">
                <select
                  value={(sel as string) ?? ''}
                  onChange={e => updateLine(line.id, {
                    selectedFinitions: { ...line.selectedFinitions, [g.id]: e.target.value },
                  })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {!g.required && <option value="">— Aucune —</option>}
                  {g.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {g.options.map(o => {
                  const isSel = Array.isArray(sel) && sel.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      onClick={() => {
                        const current = Array.isArray(sel) ? sel : []
                        const next = isSel ? current.filter(x => x !== o.id) : [...current, o.id]
                        updateLine(line.id, { selectedFinitions: { ...line.selectedFinitions, [g.id]: next } })
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                        isSel
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Sides finitions */}
      {hasSides && sf.sides.map((side: any) => {
        const sideSel: string[] = line.selectedSides[side.id] ?? []
        return (
          <div key={side.id}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{side.label}</p>
            <div className="flex flex-wrap gap-2">
              {(sf.options ?? []).map((o: any) => {
                const isSel = sideSel.includes(o.id)
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      const next = isSel ? sideSel.filter((x: string) => x !== o.id) : [...sideSel, o.id]
                      updateLine(line.id, { selectedSides: { ...line.selectedSides, [side.id]: next } })
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                      isSel
                        ? 'border-blue-500 bg-blue-100 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
