'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

export interface FileInfo {
  width_mm?: number
  height_mm?: number
  colorspace?: string
  pages?: number
  dpi?: number | null
}

// Un fichier dans le mode multi-exemplaires
export interface CartFile {
  id: string
  file_url?: string
  file_name?: string
  file_thumb?: string
  file_validated?: boolean
  file_info?: FileInfo
  file_scale?: number
  file_analysis?: any   // rapport analyse Claude (CMYK, dimensions, score…)
  copies: number        // nombre d'exemplaires couverts par ce fichier
  page_index?: number   // page dans un PDF multi-pages (1-based)
  total_pages?: number  // nombre total de pages du PDF source
}

export interface CartItemInput {
  product_id: string
  product?: Product
  quantity: number
  width_cm?: number
  height_cm?: number
  unit_price: number
  total_price: number
  file_url?: string
  file_name?: string
  file_thumb?: string        // data-URL base64 miniature (images) ou null
  file_validated?: boolean
  file_info?: FileInfo
  file_scale?: number
  file_analysis?: any        // rapport analyse Claude (SingleFileZone)
  files?: CartFile[]         // mode multi-fichiers (quantity > 1)
  notes?: string
  reference?: string
}

export interface CartItem extends CartItemInput {
  id: string
}

interface CartStore {
  items: CartItem[]
  orderReference: string
  addItem: (item: CartItemInput) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateItem: (id: string, patch: Partial<CartItem>) => void
  setOrderReference: (ref: string) => void
  clearCart: () => void
  total: () => number
}

function uniqueId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function dedupeItems(items: CartItem[]): CartItem[] {
  const seen = new Set<string>()
  return items.filter(i => {
    if (seen.has(i.id)) return false
    seen.add(i.id)
    return true
  })
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderReference: '',
      addItem: (input) => {
        const id = uniqueId()
        set(s => {
          // évite les doublons en cas de double-render (StrictMode)
          if (s.items.some(i => i.id === id)) return s
          return { items: [...s.items, { ...input, id }] }
        })
        window.dispatchEvent(new Event('cart-updated'))
      },
      removeItem: (id) => {
        set(s => ({ items: s.items.filter(i => i.id !== id) }))
        window.dispatchEvent(new Event('cart-updated'))
      },
      updateQuantity: (id, quantity) => {
        set(s => ({
          items: s.items.map(i => i.id === id
            ? { ...i, quantity, total_price: i.unit_price * quantity }
            : i
          )
        }))
        window.dispatchEvent(new Event('cart-updated'))
      },
      updateItem: (id, patch) => {
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, ...patch } : i)
        }))
        window.dispatchEvent(new Event('cart-updated'))
      },
      setOrderReference: (ref) => {
        set({ orderReference: ref })
      },
      clearCart: () => {
        set({ items: [], orderReference: '' })
        window.dispatchEvent(new Event('cart-updated'))
      },
      total: () => get().items.reduce((sum, i) => sum + i.total_price, 0),
    }),
    {
      name: 'comink_cart',
      // déduplique les items au chargement depuis localStorage
      merge: (persisted: unknown, current: CartStore): CartStore => {
        const p = persisted as Partial<CartStore>
        return {
          ...current,
          ...p,
          items: dedupeItems(p?.items ?? []),
          orderReference: p?.orderReference ?? '',
        }
      },
    }
  )
)
