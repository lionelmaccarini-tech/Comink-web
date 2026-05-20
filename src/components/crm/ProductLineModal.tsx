'use client'

import React, { useEffect, useState } from 'react'
import { X, ChevronRight, Loader2 } from 'lucide-react'
import { calculatePricePerM2 } from '@/lib/utils'
import type { QuoteLine } from './QuoteEditor'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'per_m2' | 'percent'
  price_supplement: number
  default_selected?: boolean
}

interface FinitionGroup {
  id: string
  label: string
  display_type: 'checkbox' | 'radio' | 'select'
  required: boolean
  options: FinitionOption[]
}

interface DelaiOption {
  id: string
  days: number
  label: string
  price_supplement: number
  is_express: boolean
}

interface SidesFinitions {
  enabled: boolean
  sides: Array<{ id: string; label: string }>
  options: Array<{ id: string; label: string; price_supplement: number }>
  incompatibilities?: Array<[string, string]>   // pairs of option IDs that cannot coexist
}

interface Product {
  id: string
  name: string
  category?: string
  price_per_m2?: number
  price_flat?: number
  vat_rate?: number
  finitions?: FinitionGroup[]
  delai_options?: DelaiOption[]
  sides_finitions?: SidesFinitions
  min_width_cm?: number
  min_height_cm?: number
}

interface Props {
  product: Product
  onConfirm: (line: QuoteLine) => void
  onClose: () => void
}

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductLineModal({ product, onConfirm, onClose }: Props) {
  const hasDimensions  = !!(product.price_per_m2)
  const finGroups      = product.finitions ?? []
  const delaiOpts      = product.delai_options ?? []
  const sidesFinitions = product.sides_finitions

  // State
  const [widthCm,   setWidthCm]   = useState(product.min_width_cm  ?? 100)
  const [heightCm,  setHeightCm]  = useState(product.min_height_cm ?? 100)
  const [quantity,  setQuantity]  = useState(1)
  const [selFin,    setSelFin]    = useState<Record<string, string | string[]>>(() => {
    const defaults: Record<string, string | string[]> = {}
    for (const g of finGroups) {
      const defaultOpts = g.options.filter(o => o.default_selected).map(o => o.id)
      if (defaultOpts.length) {
        defaults[g.id] = g.display_type === 'checkbox' ? defaultOpts : defaultOpts[0]
      }
    }
    return defaults
  })
  const [selSides,  setSelSides]  = useState<Record<string, string[]>>({})
  const [selDelai,  setSelDelai]  = useState<DelaiOption | null>(delaiOpts[0] ?? null)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [priceOverridden, setPriceOverridden] = useState(false)
  const [description, setDescription] = useState(product.name)

  // ── Price calculation ──────────────────────────────────────────────────────
  const computedPrice = (() => {
    let base = 0
    if (hasDimensions && product.price_per_m2) {
      base = calculatePricePerM2(widthCm, heightCm, product.price_per_m2)
    } else if (product.price_flat) {
      base = product.price_flat
    }

    const surfaceM2 = (widthCm / 100) * (heightCm / 100)

    // Finition supplements
    for (const g of finGroups) {
      const sel = selFin[g.id]
      if (!sel) continue
      const ids = Array.isArray(sel) ? sel : [sel]
      for (const optId of ids) {
        const opt = g.options.find(o => o.id === optId)
        if (!opt) continue
        if (opt.price_type === 'fixed')   base += opt.price_supplement
        if (opt.price_type === 'per_m2')  base += opt.price_supplement * surfaceM2
        if (opt.price_type === 'percent') base += base * opt.price_supplement / 100
      }
    }

    // Sides finition supplements
    if (sidesFinitions?.enabled) {
      for (const side of sidesFinitions.sides) {
        const optIds = selSides[side.id] ?? []
        for (const optId of optIds) {
          const opt = sidesFinitions.options.find(o => o.id === optId)
          if (opt) base += opt.price_supplement
        }
      }
    }

    // Délai supplement
    if (selDelai?.price_supplement) base += selDelai.price_supplement

    return Math.round(base * 100) / 100
  })()

  // Sync price when computed changes (unless manually overridden)
  useEffect(() => {
    if (!priceOverridden) setUnitPrice(computedPrice)
  }, [computedPrice, priceOverridden])

  // ── Finition helpers ───────────────────────────────────────────────────────
  const toggleCheckbox = (groupId: string, optId: string) => {
    setSelFin(prev => {
      const current = (prev[groupId] as string[] | undefined) ?? []
      const next = current.includes(optId)
        ? current.filter(id => id !== optId)
        : [...current, optId]
      return { ...prev, [groupId]: next }
    })
  }

  const toggleSide = (sideId: string, optId: string) => {
    const incompatibilities = sidesFinitions?.incompatibilities ?? []
    setSelSides(prev => {
      const current = prev[sideId] ?? []
      if (current.includes(optId)) {
        // Deselect
        return { ...prev, [sideId]: current.filter(id => id !== optId) }
      }
      // Select — compute all option IDs incompatible with this one
      const incompatibleWith = incompatibilities
        .filter(([a, b]) => a === optId || b === optId)
        .map(([a, b]) => (a === optId ? b : a))
      // Remove those from every side
      const next: Record<string, string[]> = {}
      for (const sid of (sidesFinitions?.sides ?? []).map(s => s.id)) {
        const existing = sid === sideId ? [...current, optId] : (prev[sid] ?? [])
        next[sid] = existing.filter(id => !incompatibleWith.includes(id))
      }
      return next
    })
  }

  // ── Compute set of option IDs that conflict with current selections ───────────
  const incompatibleOptionIds = (() => {
    const incompatibilities = sidesFinitions?.incompatibilities ?? []
    const allSelected = Object.values(selSides).flat()
    const blocked = new Set<string>()
    for (const selId of allSelected) {
      for (const [a, b] of incompatibilities) {
        if (a === selId) blocked.add(b)
        if (b === selId) blocked.add(a)
      }
    }
    // Don't block an option that is itself selected (it's already chosen)
    for (const selId of allSelected) blocked.delete(selId)
    return blocked
  })()

  // ── Build finitions summary for the line ───────────────────────────────────
  const buildDetails = (): string => {
    const parts: string[] = []
    if (hasDimensions) parts.push(`${widthCm} × ${heightCm} cm`)

    for (const g of finGroups) {
      const sel = selFin[g.id]
      if (!sel) continue
      const ids = Array.isArray(sel) ? sel : [sel]
      const labels = g.options.filter(o => ids.includes(o.id)).map(o => o.label)
      if (labels.length) parts.push(`${g.label} : ${labels.join(', ')}`)
    }

    if (sidesFinitions?.enabled) {
      for (const side of sidesFinitions.sides) {
        const optIds = selSides[side.id] ?? []
        const labels = sidesFinitions.options.filter(o => optIds.includes(o.id)).map(o => o.label)
        if (labels.length) parts.push(`${side.label} : ${labels.join(', ')}`)
      }
    }

    if (selDelai) parts.push(selDelai.label)
    return parts.join('  ·  ')
  }

  const handleConfirm = () => {
    const details = buildDetails()
    const line: QuoteLine = {
      id:            crypto.randomUUID(),
      product_id:    product.id,
      description,
      details:       details || undefined,
      quantity,
      unit_price_ht: unitPrice,
      vat_rate:      product.vat_rate ?? 21,
      width_cm:      hasDimensions ? widthCm  : undefined,
      height_cm:     hasDimensions ? heightCm : undefined,
      delai_days:    selDelai?.days    ?? undefined,
      delai_label:   selDelai?.label   ?? undefined,
    }
    onConfirm(line)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{product.name}</h2>
            {product.category && <p className="text-xs text-slate-400 mt-0.5 capitalize">{product.category}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description de la ligne</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Dimensions */}
          {hasDimensions && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dimensions</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Largeur (cm)</label>
                  <input type="number" min={product.min_width_cm ?? 1} value={widthCm}
                    onChange={e => setWidthCm(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Hauteur (cm)</label>
                  <input type="number" min={product.min_height_cm ?? 1} value={heightCm}
                    onChange={e => setHeightCm(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Surface : {((widthCm / 100) * (heightCm / 100)).toFixed(2)} m²
                {product.price_per_m2 && ` · ${fmt(product.price_per_m2)}/m²`}
              </p>
            </div>
          )}

          {/* Finitions */}
          {finGroups.map(group => (
            <div key={group.id}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {group.label}{group.required && <span className="text-red-400 ml-1">*</span>}
              </label>

              {group.display_type === 'select' ? (
                <select
                  value={(selFin[group.id] as string) ?? ''}
                  onChange={e => setSelFin(p => ({ ...p, [group.id]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {!group.required && <option value="">— Aucun —</option>}
                  {group.options.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.label}{o.price_supplement > 0 ? ` (+${fmt(o.price_supplement)})` : ''}
                    </option>
                  ))}
                </select>
              ) : group.display_type === 'radio' ? (
                <div className="flex flex-wrap gap-2">
                  {group.options.map(o => {
                    const checked = selFin[group.id] === o.id
                    return (
                      <button key={o.id} type="button"
                        onClick={() => setSelFin(p => ({ ...p, [group.id]: o.id }))}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          checked ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}>
                        {o.label}
                        {o.price_supplement > 0 && <span className={`text-xs ml-1 ${checked ? 'text-blue-200' : 'text-slate-400'}`}>+{fmt(o.price_supplement)}</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                // Checkbox
                <div className="flex flex-wrap gap-2">
                  {group.options.map(o => {
                    const current = (selFin[group.id] as string[] | undefined) ?? []
                    const checked = current.includes(o.id)
                    return (
                      <button key={o.id} type="button"
                        onClick={() => toggleCheckbox(group.id, o.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          checked ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}>
                        {o.label}
                        {o.price_supplement > 0 && <span className={`text-xs ml-1 ${checked ? 'text-blue-200' : 'text-slate-400'}`}>+{fmt(o.price_supplement)}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Sides finitions */}
          {sidesFinitions?.enabled && (
            <div className="space-y-4">
              {(sidesFinitions.incompatibilities?.length ?? 0) > 0 && (
                <p className="text-xs text-slate-400 italic">Certaines options sont incompatibles entre elles.</p>
              )}
              {sidesFinitions.sides.map(side => {
                // Sort incompatible options to the end
                const sorted = [...sidesFinitions.options].sort((a, b) => {
                  const aIncompat = incompatibleOptionIds.has(a.id) ? 1 : 0
                  const bIncompat = incompatibleOptionIds.has(b.id) ? 1 : 0
                  return aIncompat - bIncompat
                })
                return (
                  <div key={side.id}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{side.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {sorted.map(o => {
                        const checked   = (selSides[side.id] ?? []).includes(o.id)
                        const incompat  = !checked && incompatibleOptionIds.has(o.id)
                        return (
                          <button key={o.id} type="button"
                            onClick={() => toggleSide(side.id, o.id)}
                            title={incompat ? 'Incompatible avec une option déjà sélectionnée' : undefined}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                              checked
                                ? 'bg-blue-600 text-white border-blue-600'
                                : incompat
                                  ? 'border-slate-200 text-slate-300 bg-slate-50 opacity-40 grayscale cursor-not-allowed'
                                  : 'border-slate-200 text-slate-600 hover:border-blue-300'
                            }`}>
                            {o.label}
                            {o.price_supplement > 0 && (
                              <span className={`text-xs ml-1 ${checked ? 'text-blue-200' : 'text-slate-400'}`}>+{fmt(o.price_supplement)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Délai */}
          {delaiOpts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Délai de production</label>
              <div className="grid grid-cols-2 gap-2">
                {delaiOpts.map(d => {
                  const selected = selDelai?.id === d.id
                  return (
                    <button key={d.id} type="button"
                      onClick={() => setSelDelai(d)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        selected ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}>
                      <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-800'}`}>{d.label}</p>
                      {d.price_supplement > 0 && (
                        <p className={`text-xs mt-0.5 ${selected ? 'text-blue-200' : 'text-slate-400'}`}>+{fmt(d.price_supplement)}</p>
                      )}
                      {d.is_express && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>EXPRESS</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Quantité</label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Price */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix unitaire HT</label>
              {priceOverridden && (
                <button onClick={() => { setPriceOverridden(false); setUnitPrice(computedPrice) }}
                  className="text-xs text-blue-600 hover:underline">
                  Réinitialiser ({fmt(computedPrice)})
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input type="number" min={0} step={0.01} value={unitPrice}
                  onChange={e => { setPriceOverridden(true); setUnitPrice(parseFloat(e.target.value) || 0) }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total HT</p>
                <p className="text-lg font-bold text-blue-600">{fmt(quantity * unitPrice)}</p>
              </div>
            </div>
            {!priceOverridden && computedPrice > 0 && (
              <p className="text-xs text-slate-400 mt-1">Prix calculé automatiquement depuis le catalogue</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            Ajouter la ligne <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
