'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ShoppingCart, Plus, Minus, ChevronRight, PackagePlus } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface AccessoireItem {
  product: Product
  quantity: number
  selected: boolean
}

interface Props {
  accessories: Product[]
  onClose: () => void
  onViewCart: () => void
}

export default function AccessoiresModal({ accessories, onClose, onViewCart }: Props) {
  const { addItem } = useCart()

  const [items, setItems] = useState<AccessoireItem[]>(
    accessories.map(p => ({ product: p, quantity: 1, selected: false }))
  )
  const [added, setAdded] = useState(false)

  function toggleSelect(id: string) {
    setItems(prev => prev.map(it =>
      it.product.id === id ? { ...it, selected: !it.selected } : it
    ))
  }

  function changeQty(id: string, delta: number) {
    setItems(prev => prev.map(it =>
      it.product.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
    ))
  }

  const selectedItems = items.filter(it => it.selected)
  const totalExtra = selectedItems.reduce((sum, it) => {
    const price = it.product.price_per_m2 ?? it.product.standard_sizes?.[0]?.price ?? 0
    return sum + price * it.quantity
  }, 0)

  function handleAddSelected() {
    if (!selectedItems.length) return
    for (const it of selectedItems) {
      const p = it.product
      const basePrice = p.standard_sizes?.[0]?.price ?? p.price_per_m2 ?? 0
      addItem({
        product_id: p.id,
        product: p as any,
        quantity: it.quantity,
        unit_price: basePrice,
        total_price: basePrice * it.quantity,
        selectedFinitions: {},
        selectedDelai: p.delai_options?.length
          ? [...(p.delai_options)].sort((a, b) => a.days - b.days)[0]
          : null,
        selectedSides: {},
      } as any)
    }
    setAdded(true)
  }

  function handleViewCart() {
    if (selectedItems.length && !added) handleAddSelected()
    onViewCart()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <PackagePlus className="w-4.5 h-4.5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Accessoires recommandés</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez les accessoires à ajouter à votre commande
                </p>
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
            const basePrice = p.standard_sizes?.[0]?.price ?? p.price_per_m2 ?? 0
            const hasVariablePrice = !p.standard_sizes?.length && p.price_per_m2

            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`
                  relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                  ${it.selected
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }
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
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <Image
                      src={p.image_url || p.images![0]}
                      alt={p.name}
                      width={56}
                      height={56}
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
                  <p className="text-xs font-bold text-sky-600 mt-1">
                    {hasVariablePrice
                      ? `À partir de ${formatPrice(basePrice)}/m²`
                      : basePrice > 0 ? formatPrice(basePrice) : 'Sur devis'
                    }
                  </p>
                </div>

                {/* Quantity (only when selected) */}
                {it.selected && (
                  <div
                    className="flex-shrink-0 flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
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
