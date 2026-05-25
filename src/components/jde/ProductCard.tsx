'use client'

import React, { useState } from 'react'
import { useJDE, type JDEProduct } from './JDEContext'
import { ShoppingCart, Check } from 'lucide-react'

interface ProductCardProps {
  product: JDEProduct
}

export default function ProductCard({ product }: ProductCardProps) {
  const { jdeClient, addToCart } = useJDE()
  const [added, setAdded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const previewUrl =
    product.template_url && jdeClient?.logo_url && !imgError
      ? `/api/jde/preview?product_id=${encodeURIComponent(product.id)}&logo_url=${encodeURIComponent(jdeClient.logo_url)}`
      : product.template_url ?? null

  const handleAdd = () => {
    addToCart(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const canAfford = jdeClient ? jdeClient.points_balance >= product.point_cost : true

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-[#F5C200] transition-all group">
      {/* Image / preview */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <span className="text-4xl">🖼️</span>
          </div>
        )}

        {/* Point cost badge */}
        <div className="absolute top-2 right-2 bg-[#E8271A] text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow">
          {product.point_cost} pts
        </div>

        {/* Category badge */}
        {product.category && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {product.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">{product.description}</p>
        )}

        {/* Logo preview indicator */}
        {jdeClient?.logo_url && (
          <p className="text-xs text-green-600 font-medium mb-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Aperçu avec votre logo
          </p>
        )}
        {!jdeClient?.logo_url && (
          <p className="text-xs text-amber-600 font-medium mb-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Ajoutez votre logo pour l'aperçu
          </p>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAfford}
          className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition-colors ${
            added
              ? 'bg-green-500 text-white'
              : canAfford
              ? 'bg-[#F5C200] hover:bg-yellow-400 text-slate-900'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              Ajouté !
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              {canAfford ? 'Ajouter' : 'Points insuffisants'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
