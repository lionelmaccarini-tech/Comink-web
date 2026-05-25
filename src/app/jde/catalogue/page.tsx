'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProductCard from '@/components/jde/ProductCard'
import { useJDE } from '@/components/jde/JDEContext'
import { Loader2 } from 'lucide-react'

interface JDEProduct {
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

export default function JDECataloguePage() {
  const { jdeClient } = useJDE()
  const [products, setProducts] = useState<JDEProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jde_products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [])

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
  const filtered = activeCategory ? products.filter(p => p.category === activeCategory) : products

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8271A]" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Catalogue JDE</h1>
        <p className="text-slate-500 text-sm">
          Sélectionnez vos produits personnalisés avec votre logo
        </p>
        {jdeClient && (
          <div className="inline-flex items-center gap-2 mt-3 bg-[#F5C200] text-slate-900 font-bold text-sm px-4 py-1.5 rounded-full">
            <span>Votre solde :</span>
            <span className="text-lg">{jdeClient.points_balance} pts</span>
          </div>
        )}
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              activeCategory === null
                ? 'bg-[#E8271A] text-white border-[#E8271A]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#E8271A]'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                activeCategory === cat
                  ? 'bg-[#E8271A] text-white border-[#E8271A]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#E8271A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-4">🛍️</p>
          <p className="font-semibold">Aucun produit disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
