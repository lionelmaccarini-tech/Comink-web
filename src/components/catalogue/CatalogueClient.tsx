'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Product } from '@/types'
import { CATEGORY_LABELS, formatPrice } from '@/lib/utils'

const ALL = 'all'

interface Props {
  initialProducts: Product[]
}

export default function CatalogueClient({ initialProducts }: Props) {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || ALL)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || ALL)
  const [showFilters, setShowFilters] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set(initialProducts.map(p => p.category))
    return Array.from(cats).sort()
  }, [initialProducts])

  const filtered = useMemo(() => {
    return initialProducts.filter(p => {
      if (selectedType !== ALL && p.product_type !== selectedType) return false
      if (selectedCategory !== ALL && p.category !== selectedCategory) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      }
      return true
    })
  }, [initialProducts, selectedType, selectedCategory, search])

  const resetFilters = () => {
    setSelectedType(ALL)
    setSelectedCategory(ALL)
    setSearch('')
  }

  const hasFilters = selectedType !== ALL || selectedCategory !== ALL || search

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium bg-white hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {hasFilters && <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">!</span>}
        </button>
        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2.5 border border-slate-200 rounded-lg bg-white">
            <X className="w-3.5 h-3.5" /> Effacer
          </button>
        )}
      </div>

      {/* Panel filtres */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {[{ v: ALL, l: 'Tous' }, { v: 'sur_mesure', l: 'Sur mesure' }, { v: 'taille_standard', l: 'Taille standard' }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setSelectedType(opt.v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedType === opt.v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(ALL)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedCategory === ALL ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
              >
                Toutes
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Résultats */}
      <p className="text-sm text-slate-500 mb-4">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm">Aucun produit ne correspond à votre recherche.</p>
          <button onClick={resetFilters} className="mt-4 text-blue-600 text-sm font-semibold hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(product => {
            const img = product.image_url || product.images?.[0]
            const minPrice = product.price_per_m2
              ? `dès ${product.price_per_m2.toFixed(2)} € / m² HTVA`
              : product.standard_sizes?.length
                ? `dès ${Math.min(...product.standard_sizes.filter(s => s.price > 0).map(s => s.price)).toFixed(2)} € HTVA`
                : null

            return (
              <Link
                key={product.id}
                href={`/produit/${product.id}`}
                className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {img ? (
                    <img src={img} alt={product.name} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Pas d'image</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{CATEGORY_LABELS[product.category] || product.category}</p>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mt-0.5 leading-snug">
                    {product.name}
                  </h3>
                  {minPrice && <p className="text-xs font-bold text-blue-600 mt-1">{minPrice}</p>}
                  <span className="inline-flex items-center mt-2 text-[10px] font-semibold text-blue-600 group-hover:gap-1 transition-all">
                    Voir le produit →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
