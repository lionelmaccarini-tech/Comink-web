import React from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#060e1f' }

const CATEGORY_LABELS: Record<string, string> = {
  banderoles: 'Banderoles', roll_up: 'Roll-up', drapeaux: 'Drapeaux',
  adhesifs: 'Adhésifs', toiles: 'Toiles', baches: 'Bâches', panneaux: 'Panneaux',
  textile: 'Textile', papier: 'Papier', accessoires: 'Accessoires',
  supports_evenementiels: 'Supports évén.', vinyle_autocollant: 'Vinyle autocollant',
}

// Couleur accent par catégorie — ordre CMYK cyclique
const CAT_COLORS: Record<string, string> = {
  banderoles: C.cyan, roll_up: C.magenta, baches: C.yellow,
  drapeaux: C.cyan, adhesifs: C.magenta, toiles: C.yellow,
  panneaux: C.cyan, textile: C.magenta, papier: C.yellow,
}
function catColor(cat: string) {
  return CAT_COLORS[cat] ?? C.cyan
}

const getFeaturedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, category, product_type, price_per_m2, standard_sizes, image_url, images, available')
        .eq('available', true)
        .neq('category', 'accessoires')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8)
      return (data ?? []) as Product[]
    } catch {
      return []
    }
  },
  ['products-featured'],
  { revalidate: 300 }
)

export default async function FeaturedCategories() {
  const products = await getFeaturedProducts()

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#09111f' }}>

      {/* Ligne de séparation CMYK en haut */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex">
        <div className="flex-1" style={{ background: C.cyan }} />
        <div className="flex-1" style={{ background: C.magenta }} />
        <div className="flex-1" style={{ background: C.yellow }} />
      </div>

      {/* Fond subtil watermark */}
      <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='120'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial Black%2CArial' font-weight='900' font-size='42' fill='white' letter-spacing='6' transform='rotate(-18 150 60)'%3ECOMINK%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '300px 120px',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: C.yellow }}>
              ◆ NOS PRODUITS PHARES
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Les indispensables<br className="hidden sm:block" />
              <span style={{ color: C.cyan }}> pour vos projets.</span>
            </h2>
          </div>
          <Link href="/catalogue"
            className="hidden md:flex items-center gap-1.5 text-sm font-black transition-colors group"
            style={{ color: C.yellow }}>
            Voir tout le catalogue
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Grille produits */}
        {products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse aspect-[3/4]"
                style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-5 ${
            products.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
            products.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
            products.length === 3 ? 'grid-cols-2 md:grid-cols-3' :
            'grid-cols-2 md:grid-cols-4'
          }`}>
            {products.map((product, idx) => {
              const img = product.image_url || product.images?.[0]
              const accent = catColor(product.category)
              const minPrice = product.price_per_m2
                ? `dès ${product.price_per_m2.toFixed(2)} € / m²`
                : product.standard_sizes?.length
                  ? `dès ${Math.min(...product.standard_sizes.filter(s => s.price > 0).map(s => s.price)).toFixed(2)} €`
                  : null

              return (
                <Link key={product.id} href={`/produit/${product.id}`}
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
                        className="w-full h-full object-contain p-3 transition-transform duration-700 group-hover:scale-105"
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
                      {CATEGORY_LABELS[product.category] || product.category}
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

        {/* CTA mobile */}
        <div className="mt-8 text-center md:hidden">
          <Link href="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm font-black"
            style={{ color: C.yellow }}>
            Voir tout le catalogue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
