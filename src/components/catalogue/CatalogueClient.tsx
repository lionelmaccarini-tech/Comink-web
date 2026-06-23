'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, X, ArrowRight } from 'lucide-react'
import type { Product } from '@/types'
import { CATEGORY_LABELS } from '@/lib/utils'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#09111f' }
const ALL = 'all'

function catColor(_cat: string) { return C.cyan }

interface Props { initialProducts: Product[]; categoryLabels?: Record<string, string> }

export default function CatalogueClient({ initialProducts, categoryLabels: dbLabels = {} }: Props) {
  const catLabel = (cat: string) => dbLabels[cat] || CATEGORY_LABELS[cat] || cat
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || ALL)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || ALL)

  useEffect(() => {
    setSelectedType(searchParams.get('type') || ALL)
    setSelectedCategory(searchParams.get('category') || ALL)
  }, [searchParams])

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

  const resetFilters = () => { setSelectedType(ALL); setSelectedCategory(ALL); setSearch('') }
  const hasFilters = selectedType !== ALL || selectedCategory !== ALL || !!search

  const TYPES = [
    { v: ALL,               l: 'Tous',            color: C.cyan    },
    { v: 'sur_mesure',      l: 'Sur mesure',      color: C.cyan    },
    { v: 'taille_standard', l: 'Taille standard', color: C.magenta },
  ]

  return (
    <div className="relative">
    {/* Filigrane COMINK */}
    <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='120'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial Black%2CArial' font-weight='900' font-size='42' fill='white' letter-spacing='6' transform='rotate(-18 150 60)'%3ECOMINK%3C/text%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '300px 120px',
      }}
    />
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Filtres toujours visibles */}
      <div className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Recherche */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-shadow"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.boxShadow = `0 0 0 2px ${C.cyan}40`)}
            onBlur={e => (e.target.style.boxShadow = '')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Type */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: C.cyan }}>Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(opt => (
                <button key={opt.v} onClick={() => setSelectedType(opt.v)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={selectedType === opt.v
                    ? { background: opt.color, color: '#fff', border: `1px solid ${opt.color}` }
                    : { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: C.magenta }}>Catégorie</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedCategory(ALL)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={selectedCategory === ALL
                  ? { background: C.cyan, color: '#fff', border: `1px solid ${C.cyan}` }
                  : { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }}>
                Toutes
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={selectedCategory === cat
                    ? { background: C.cyan, color: '#fff', border: `1px solid ${C.cyan}` }
                    : { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {catLabel(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reset si filtres actifs */}
        {hasFilters && (
          <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <X className="w-3 h-3" /> Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {/* Compteur */}
      <p className="text-sm font-semibold mb-5" style={{ color: '#94a3b8' }}>
        <span className="font-black" style={{ color: C.cyan }}>{filtered.length}</span> produit{filtered.length > 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun produit ne correspond à votre recherche.</p>
          <button onClick={resetFilters} className="mt-4 text-sm font-semibold hover:underline" style={{ color: C.cyan }}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product, i) => {
            const img = product.image_url || product.images?.[0]
            const minPrice = product.price_per_m2
              ? `dès ${product.price_per_m2.toFixed(2)} € / m²`
              : product.standard_sizes?.length
                ? `dès ${Math.min(...product.standard_sizes.filter((s: any) => s.price > 0).map((s: any) => s.price)).toFixed(2)} €`
                : null
            const accent = catColor(product.category)

            return (
              <Link
                key={product.id}
                href={`/produit/${product.id}`}
                className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/60"
                style={{ background: '#1a3a5e', border: `2px solid ${C.cyan}` }}
              >
                {/* ── En-tête : nom produit centré en négatif ── */}
                <div className="px-3 pt-3.5 pb-3 text-center"
                  style={{ background: '#0d2240', borderBottom: `2px solid ${C.cyan}40` }}>
                  <h3 className="text-base font-black leading-snug line-clamp-2" style={{ color: '#ffffff' }}>
                    {product.name}
                  </h3>
                </div>

                {/* ── Photo ── */}
                <div className="aspect-square overflow-hidden relative flex items-center justify-center"
                  style={{ background: '#1e3f65' }}>
                  {img ? (
                    <img src={img} alt={product.name} loading="lazy"
                      className="w-full h-full object-contain p-3"
                      style={{ transform: 'scale(1)', transition: 'transform 0.7s ease' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.08)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Overlay + CTA hover */}
                  <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }}>
                    <span className="flex items-center gap-1.5 text-sm font-black text-white px-4 py-2 rounded-full"
                      style={{ background: C.cyan }}>
                      Configurer <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* ── Catégorie + Prix ── */}
                <div className="px-3 py-2.5 flex items-center justify-between"
                  style={{ background: '#0d2240', borderTop: `2px solid ${C.cyan}40` }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>
                    {catLabel(product.category)}
                  </p>
                  {minPrice && (
                    <p className="text-sm font-black" style={{ color: '#ffffff' }}>{minPrice}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
    </div>
  )
}
