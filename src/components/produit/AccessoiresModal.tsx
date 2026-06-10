'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ShoppingCart, Plus, Minus, ChevronRight, PackagePlus, ChevronDown } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

// ── Types finitions ───────────────────────────────────────────────────────────
interface FinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'percent' | 'per_m2'
  price_supplement: number
  default_selected: boolean
}
interface FinitionGroup {
  id: string
  label: string
  display_type: 'checkbox' | 'select'
  required: boolean
  options: FinitionOption[]
}

function normalizeFinitions(raw: any[]): FinitionGroup[] {
  if (!raw?.length) return []
  if (raw[0]?.options !== undefined) return raw as FinitionGroup[]
  // legacy flat format
  return [{
    id: 'finitions',
    label: 'Finitions',
    display_type: 'checkbox',
    required: false,
    options: raw.map((o: any) => ({
      id: o.id ?? o.label,
      label: o.label,
      price_type: o.price_type ?? 'fixed',
      price_supplement: o.price_supplement ?? 0,
      default_selected: o.default_selected ?? false,
    })),
  }]
}

function initFinitions(product: Product): Record<string, string | string[]> {
  const groups = normalizeFinitions((product as any).finitions ?? [])
  const sel: Record<string, string | string[]> = {}
  for (const g of groups) {
    if (g.display_type === 'select') {
      const def = g.options.find(o => o.default_selected)
      sel[g.id] = def?.id ?? g.options[0]?.id ?? ''
    } else {
      sel[g.id] = g.options.filter(o => o.default_selected).map(o => o.id)
    }
  }
  return sel
}

function calcFinitionsPrice(
  product: Product,
  sel: Record<string, string | string[]>,
  basePrice: number,
): number {
  const groups = normalizeFinitions((product as any).finitions ?? [])
  let total = 0
  for (const g of groups) {
    const selIds = g.display_type === 'select'
      ? [sel[g.id] as string]
      : (sel[g.id] as string[] ?? [])
    for (const optId of selIds) {
      const opt = g.options.find(o => o.id === optId)
      if (!opt || opt.price_supplement <= 0) continue
      if (opt.price_type === 'fixed')   total += opt.price_supplement
      if (opt.price_type === 'percent') total += basePrice * (opt.price_supplement / 100)
      // per_m2 ignoré pour les accessoires (pas de dimensions connues)
    }
  }
  return Math.round(total * 100) / 100
}

// ── Item étendu ───────────────────────────────────────────────────────────────
interface AccessoireItem {
  product: Product
  quantity: number
  selected: boolean
  selectedFinitions: Record<string, string | string[]>
  finitionsOpen: boolean
}

interface Props {
  accessories: Product[]
  onClose: () => void
  onViewCart: () => void
}

export default function AccessoiresModal({ accessories, onClose, onViewCart }: Props) {
  const { addItem } = useCart()

  const [items, setItems] = useState<AccessoireItem[]>(
    accessories.map(p => ({
      product: p,
      quantity: 1,
      selected: false,
      selectedFinitions: initFinitions(p),
      finitionsOpen: false,
    }))
  )
  const [added, setAdded] = useState(false)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setItems(prev => prev.map(it =>
      it.product.id === id ? { ...it, selected: !it.selected, finitionsOpen: !it.selected } : it
    ))
  }

  function changeQty(id: string, delta: number) {
    setItems(prev => prev.map(it =>
      it.product.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
    ))
  }

  function toggleFinitionsOpen(id: string) {
    setItems(prev => prev.map(it =>
      it.product.id === id ? { ...it, finitionsOpen: !it.finitionsOpen } : it
    ))
  }

  function setFinition(productId: string, groupId: string, value: string | string[]) {
    setItems(prev => prev.map(it =>
      it.product.id === productId
        ? { ...it, selectedFinitions: { ...it.selectedFinitions, [groupId]: value } }
        : it
    ))
  }

  function toggleCheckboxFinition(productId: string, groupId: string, optId: string) {
    setItems(prev => prev.map(it => {
      if (it.product.id !== productId) return it
      const current = (it.selectedFinitions[groupId] as string[]) ?? []
      const next = current.includes(optId)
        ? current.filter(x => x !== optId)
        : [...current, optId]
      return { ...it, selectedFinitions: { ...it.selectedFinitions, [groupId]: next } }
    }))
  }

  // ── Calculs ──────────────────────────────────────────────────────────────────
  function itemBasePrice(p: Product): number {
    return p.standard_sizes?.[0]?.price ?? p.price_per_m2 ?? 0
  }

  function itemUnitPrice(it: AccessoireItem): number {
    const base = itemBasePrice(it.product)
    return base + calcFinitionsPrice(it.product, it.selectedFinitions, base)
  }

  const selectedItems = items.filter(it => it.selected)
  const totalExtra = selectedItems.reduce((sum, it) => sum + itemUnitPrice(it) * it.quantity, 0)

  // ── Ajout panier ─────────────────────────────────────────────────────────────
  function handleAddSelected() {
    if (!selectedItems.length) return
    for (const it of selectedItems) {
      const p = it.product
      const unitPrice = itemUnitPrice(it)
      const defaultDelai = p.delai_options?.length
        ? [...p.delai_options].sort((a: any, b: any) => a.days - b.days)[0]
        : null
      addItem({
        product_id: p.id,
        product: p as any,
        quantity: it.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * it.quantity,
        selectedFinitions: it.selectedFinitions,
        selectedDelai: defaultDelai,
        selectedSides: {},
      } as any)
    }
    setAdded(true)
  }

  function handleViewCart() {
    if (selectedItems.length && !added) handleAddSelected()
    onViewCart()
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <PackagePlus className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Accessoires recommandés</h2>
                <p className="text-xs text-slate-500 mt-0.5">Sélectionnez et configurez vos accessoires</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {items.map(it => {
            const p = it.product
            const groups = normalizeFinitions((p as any).finitions ?? [])
            const hasFinitions = groups.length > 0
            const unitPrice = itemUnitPrice(it)
            const basePrice = itemBasePrice(p)
            const finitionsSupp = unitPrice - basePrice
            const hasVariablePrice = !p.standard_sizes?.length && p.price_per_m2

            return (
              <div key={p.id} className={`
                rounded-xl border-2 transition-all overflow-hidden
                ${it.selected ? 'border-sky-500' : 'border-slate-200'}
              `}>
                {/* Ligne principale — clic pour sélectionner */}
                <div
                  onClick={() => toggleSelect(p.id)}
                  className={`
                    flex items-center gap-3 p-3 cursor-pointer select-none transition-colors
                    ${it.selected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'}
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                    ${it.selected ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}
                  `}>
                    {it.selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Image */}
                  {(p.image_url || p.images?.[0]) && (
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      <Image
                        src={p.image_url || p.images![0]}
                        alt={p.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: p.description.replace(/<[^>]+>/g, '') }}
                      />
                    )}
                    <p className="text-xs font-bold text-sky-600 mt-0.5">
                      {hasVariablePrice
                        ? `À partir de ${formatPrice(basePrice)}/m²`
                        : basePrice > 0 ? formatPrice(unitPrice) : 'Sur devis'
                      }
                      {finitionsSupp > 0 && (
                        <span className="text-slate-400 font-normal"> (dont +{formatPrice(finitionsSupp)} finitions)</span>
                      )}
                    </p>
                  </div>

                  {/* Quantité (seulement si sélectionné) */}
                  {it.selected && (
                    <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => changeQty(p.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-slate-700">{it.quantity}</span>
                      <button
                        onClick={() => changeQty(p.id, +1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3 text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Finitions (dépliables, seulement si sélectionné et s'il y en a) ── */}
                {it.selected && hasFinitions && (
                  <div className="border-t border-sky-100 bg-white">
                    {/* Toggle finitions */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFinitionsOpen(p.id) }}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors"
                    >
                      <span>Finitions{finitionsSupp > 0 ? ` — +${formatPrice(finitionsSupp)}` : ''}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${it.finitionsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {it.finitionsOpen && (
                      <div className="px-4 pb-3 space-y-3">
                        {groups.map(g => (
                          <div key={g.id}>
                            <p className="text-xs font-bold text-slate-600 mb-1.5">{g.label}</p>

                            {g.display_type === 'select' ? (
                              // Select → radio boutons compacts
                              <div className="flex flex-wrap gap-1.5">
                                {g.options.map(opt => {
                                  const isSelected = it.selectedFinitions[g.id] === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={e => { e.stopPropagation(); setFinition(p.id, g.id, opt.id) }}
                                      className={`
                                        text-xs px-2.5 py-1 rounded-lg border font-medium transition-all
                                        ${isSelected
                                          ? 'border-sky-500 bg-sky-500 text-white'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                                        }
                                      `}
                                    >
                                      {opt.label}
                                      {opt.price_supplement > 0 && (
                                        <span className={isSelected ? 'text-sky-100' : 'text-slate-400'}>
                                          {' '}+{formatPrice(opt.price_supplement)}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              // Checkbox
                              <div className="flex flex-wrap gap-1.5">
                                {g.options.map(opt => {
                                  const selIds = (it.selectedFinitions[g.id] as string[]) ?? []
                                  const isChecked = selIds.includes(opt.id)
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={e => { e.stopPropagation(); toggleCheckboxFinition(p.id, g.id, opt.id) }}
                                      className={`
                                        flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all
                                        ${isChecked
                                          ? 'border-sky-500 bg-sky-500 text-white'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                                        }
                                      `}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-white bg-white' : 'border-slate-300'}`}>
                                        {isChecked && (
                                          <svg className="w-2.5 h-2.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      {opt.label}
                                      {opt.price_supplement > 0 && (
                                        <span className={isChecked ? 'text-sky-100' : 'text-slate-400'}>
                                          +{formatPrice(opt.price_supplement)}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-100 space-y-2">
          {selectedItems.length > 0 && totalExtra > 0 && (
            <p className="text-xs text-center text-slate-500">
              {selectedItems.length} accessoire{selectedItems.length > 1 ? 's' : ''} sélectionné{selectedItems.length > 1 ? 's' : ''}
              {' '}— <span className="font-semibold text-slate-700">+{formatPrice(totalExtra)}</span>
            </p>
          )}

          {added ? (
            <button
              onClick={handleViewCart}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Voir mon panier
            </button>
          ) : (
            <>
              <button
                onClick={handleAddSelected}
                disabled={!selectedItems.length}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold py-3 px-4 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {selectedItems.length
                  ? `Ajouter ${selectedItems.length} accessoire${selectedItems.length > 1 ? 's' : ''} au panier`
                  : 'Sélectionnez des accessoires'
                }
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
              >
                Continuer sans accessoires
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
