'use client'

import { useEffect, useRef } from 'react'
import { useCart, type CartItem } from '@/hooks/useCart'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem('comink_cart_sid')
  if (!sid) {
    sid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sid_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('comink_cart_sid', sid)
  }
  return sid
}

function buildFinitionsLabel(item: CartItem): string {
  const parts: string[] = []
  const finGroups = item.product?.finitions ?? []
  const selFin = (item as any).selectedFinitions ?? {}
  for (const g of finGroups) {
    const sel = selFin[g.id]
    if (!sel) continue
    const ids = Array.isArray(sel) ? sel : [sel]
    const labels = (g.options ?? []).filter((o: any) => ids.includes(o.id)).map((o: any) => o.label)
    if (labels.length) parts.push(`${g.label} : ${labels.join(', ')}`)
  }
  const selDelai = (item as any).selectedDelai
  if (selDelai?.label) parts.push(selDelai.label)
  return parts.join(' · ')
}

export default function CartSync() {
  const items = useCart(s => s.items)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const sid = getSessionId()
      if (!sid) return

      const total_ht = items.reduce((sum, i) => sum + i.total_price, 0)

      // Stocke une version légère (sans base64 ni objets lourds)
      const lightItems = items.map(item => ({
        product_id:      item.product_id,
        product_name:    item.product?.name ?? '',
        product_image:   item.product?.image_url ?? null,
        quantity:        item.quantity,
        unit_price:      item.unit_price,
        total_price:     item.total_price,
        width_cm:        item.width_cm ?? null,
        height_cm:       item.height_cm ?? null,
        file_url:        item.file_url ?? null,
        file_name:       item.file_name ?? null,
        notes:           item.notes ?? null,
        reference:       item.reference ?? null,
        finitions_label: buildFinitionsLabel(item),
      }))

      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, items: lightItems, total_ht, item_count: items.length }),
      }).catch(() => {})
    }, 2000)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [items])

  return null
}
