'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJDE } from '@/components/jde/JDEContext'
import { Loader2, ShoppingCart, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function JDEPanierPage() {
  const router = useRouter()
  const { jdeClient, cart, removeFromCart, clearCart } = useJDE()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalPoints = cart.reduce((sum, item) => sum + item.product.point_cost * item.quantity, 0)
  const remainingPoints = (jdeClient?.points_balance ?? 0) - totalPoints
  const canOrder = cart.length > 0 && remainingPoints >= 0 && jdeClient !== null

  const handleOrder = async () => {
    if (!canOrder) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/jde/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            point_cost_each: item.product.point_cost,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la commande')
        setLoading(false)
        return
      }
      clearCart()
      router.push('/jde/commandes')
    } catch {
      setError('Erreur réseau. Réessayez.')
      setLoading(false)
    }
  }

  if (!jdeClient) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">Connectez-vous pour accéder à votre panier.</p>
        <Link href="/jde/login" className="bg-[#E8271A] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">
          Se connecter
        </Link>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-700 mb-2">Votre panier est vide</h1>
        <p className="text-slate-400 text-sm mb-6">Explorez le catalogue pour ajouter des produits.</p>
        <Link href="/jde/catalogue" className="bg-[#F5C200] text-slate-900 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors">
          Voir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Mon panier</h1>

      {/* Cart items */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 mb-6">
        {cart.map(item => (
          <div key={item.product.id} className="flex items-center justify-between p-4 gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{item.product.name}</p>
              {item.product.category && (
                <p className="text-xs text-slate-400">{item.product.category}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-slate-500">x{item.quantity}</span>
              <span className="font-bold text-[#E8271A] text-sm">
                {item.product.point_cost * item.quantity} pts
              </span>
              <button
                onClick={() => removeFromCart(item.product.id)}
                className="text-slate-300 hover:text-[#E8271A] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Solde actuel</span>
            <span className="font-semibold text-slate-800">{jdeClient.points_balance} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total commande</span>
            <span className="font-bold text-[#E8271A]">{totalPoints} pts</span>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between">
            <span className="font-semibold text-slate-700">Solde après commande</span>
            <span className={`font-extrabold text-lg ${remainingPoints < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {remainingPoints} pts
            </span>
          </div>
        </div>
        {remainingPoints < 0 && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            Solde insuffisant. Il vous manque {Math.abs(remainingPoints)} points.
          </p>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={clearCart}
          className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
        >
          Vider le panier
        </button>
        <button
          onClick={handleOrder}
          disabled={!canOrder || loading}
          className="flex-1 bg-[#E8271A] hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider la commande'}
        </button>
      </div>

      {!jdeClient.logo_url && (
        <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          Conseil : Ajoutez votre logo dans{' '}
          <Link href="/jde/compte" className="font-bold underline">Mon compte</Link>
          {' '}pour personnaliser vos produits avant de commander.
        </p>
      )}
    </div>
  )
}
