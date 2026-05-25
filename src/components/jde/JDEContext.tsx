'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface JDEProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  point_cost: number
  template_url: string | null
  logo_zone: { x: number; y: number; width: number; height: number }
  active: boolean
  sort_order: number
}

export interface JDEClient {
  id: string
  user_id: string | null
  full_name: string
  company: string | null
  email: string
  points_balance: number
  logo_url: string | null
  logo_name: string | null
  is_active: boolean
  notes: string | null
}

export interface CartItem {
  product: JDEProduct
  quantity: number
}

interface JDEContextValue {
  jdeClient: JDEClient | null
  cart: CartItem[]
  cartCount: number
  addToCart: (product: JDEProduct, quantity?: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  refreshClient: () => Promise<void>
}

const JDEContext = createContext<JDEContextValue | null>(null)

const CART_KEY = 'jde_cart'

export function JDEProvider({ children }: { children: React.ReactNode }) {
  const [jdeClient, setJdeClient] = useState<JDEClient | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  // Load cart from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      if (stored) setCart(JSON.parse(stored))
    } catch {}
  }, [])

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {}
  }, [cart])

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch('/api/jde/clients/me')
      if (res.ok) {
        const data = await res.json()
        setJdeClient(data.client ?? null)
      } else {
        setJdeClient(null)
      }
    } catch {
      setJdeClient(null)
    }
  }, [])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const addToCart = useCallback((product: JDEProduct, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { product, quantity }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <JDEContext.Provider value={{
      jdeClient,
      cart,
      cartCount,
      addToCart,
      removeFromCart,
      clearCart,
      refreshClient: fetchClient,
    }}>
      {children}
    </JDEContext.Provider>
  )
}

export function useJDE(): JDEContextValue {
  const ctx = useContext(JDEContext)
  if (!ctx) throw new Error('useJDE must be used within JDEProvider')
  return ctx
}
