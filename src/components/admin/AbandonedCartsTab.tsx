'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, RefreshCw, User, Mail, Clock, ChevronDown, ChevronUp, Package, AlertTriangle, X } from 'lucide-react'

interface CartItemLight {
  product_id: string
  product_name: string
  product_image?: string | null
  quantity: number
  unit_price: number
  total_price: number
  width_cm?: number | null
  height_cm?: number | null
  file_url?: string | null
  file_name?: string | null
  notes?: string | null
  reference?: string | null
  finitions_label?: string
}

interface AbandonedCart {
  id: string
  session_id: string
  user_id: string | null
  client_name: string | null
  client_email: string | null
  items: CartItemLight[]
  total_ht: number
  item_count: number
  last_seen_at: string
  created_at: string
  converted_at: string | null
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return `Il y a ${Math.floor(diff / 86400)} j`
}

function heatBadge(last_seen_at: string) {
  const h = (Date.now() - new Date(last_seen_at).getTime()) / 3600000
  if (h < 1) return { label: 'Chaud', cls: 'bg-red-100 text-red-700 border-red-200' }
  if (h < 24) return { label: 'Tiède', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
  return { label: 'Froid', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function CartDetail({ cart, onClose }: { cart: AbandonedCart; onClose: () => void }) {
  const tax = Math.round(cart.total_ht * 0.21 * 100) / 100
  const total_ttc = Math.round((cart.total_ht + tax) * 100) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Panier abandonné</p>
            <h2 className="text-lg font-black text-slate-900">
              {cart.client_name ?? 'Visiteur anonyme'}
            </h2>
            {cart.client_email && (
              <p className="text-sm text-slate-500 mt-0.5">{cart.client_email}</p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Métadonnées */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dernière visite</p>
            <p className="text-sm font-semibold text-slate-700">{timeAgo(cart.last_seen_at)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(cart.last_seen_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Articles</p>
            <p className="text-sm font-semibold text-slate-700">{cart.item_count} article{cart.item_count > 1 ? 's' : ''}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Total HT</p>
            <p className="text-base font-black text-blue-700">{cart.total_ht.toFixed(2)} €</p>
          </div>
        </div>

        {/* Articles */}
        <div className="p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Détail des articles</p>
          <div className="space-y-2">
            {(cart.items ?? []).map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="w-12 h-12 object-contain rounded-lg bg-white border border-slate-200 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{item.product_name || 'Article'}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {item.width_cm && item.height_cm && (
                      <p className="text-xs text-slate-500">{item.width_cm} × {item.height_cm} cm</p>
                    )}
                    {item.finitions_label && (
                      <p className="text-xs text-slate-500">{item.finitions_label}</p>
                    )}
                    {item.file_name && (
                      <p className="text-xs text-slate-400 truncate">📎 {item.file_name}</p>
                    )}
                    {item.reference && (
                      <p className="text-xs text-slate-400">Réf: {item.reference}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-slate-400 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">x{item.quantity}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.unit_price.toFixed(2)} € / u.</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{item.total_price.toFixed(2)} €</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Sous-total HT</span>
              <span>{cart.total_ht.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>TVA 21%</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total TTC estimé</span>
              <span className="text-blue-700">{total_ttc.toFixed(2)} €</span>
            </div>
          </div>

          {/* Action contact */}
          {cart.client_email && (
            <a href={`mailto:${cart.client_email}?subject=Votre panier Comink`}
              className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              <Mail className="w-4 h-4" /> Contacter {cart.client_name ?? cart.client_email}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AbandonedCartsTab() {
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AbandonedCart | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/carts')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCarts(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalHT = carts.reduce((s, c) => s + (c.total_ht ?? 0), 0)
  const withEmail = carts.filter(c => c.client_email).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paniers abandonnés</h2>
          <p className="text-sm text-slate-500 mt-0.5">Paniers avec articles non convertis en devis</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{carts.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Paniers actifs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{totalHT.toFixed(0)} €</p>
          <p className="text-xs text-slate-500 mt-0.5">Valeur totale HT</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{withEmail}</p>
          <p className="text-xs text-slate-500 mt-0.5">Clients identifiés</p>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Erreur</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <p className="text-xs text-red-500 mt-1">Vérifiez que la table <code className="bg-red-100 px-1 rounded">carts</code> existe dans Supabase.</p>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading && !carts.length ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
      ) : carts.length === 0 && !error ? (
        <div className="py-20 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-semibold">Aucun panier abandonné</p>
          <p className="text-slate-400 text-xs mt-1">Les paniers apparaissent ici dès qu'un visiteur ajoute un article</p>
        </div>
      ) : (
        <div className="space-y-2">
          {carts.map(cart => {
            const heat = heatBadge(cart.last_seen_at)
            return (
              <button key={cart.id} onClick={() => setSelected(cart)}
                className="w-full bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left flex items-center gap-4 shadow-sm">
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {cart.client_name ? (
                    <User className="w-5 h-5 text-blue-500" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {cart.client_name ?? 'Visiteur anonyme'}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${heat.cls}`}>
                      {heat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {cart.client_email && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Mail className="w-3 h-3" /> {cart.client_email}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" /> {timeAgo(cart.last_seen_at)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {cart.item_count} article{cart.item_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Montant */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black text-slate-900">{(cart.total_ht ?? 0).toFixed(2)} €</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">HT</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <CartDetail cart={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
