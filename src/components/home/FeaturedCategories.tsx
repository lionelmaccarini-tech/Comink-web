import React from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import type { Product } from '@/types'
import TiltCard from '@/components/ui/TiltCard'

const CATEGORY_LABELS: Record<string, string> = {
  banderoles: 'Banderoles', roll_up: 'Roll-up', drapeaux: 'Drapeaux',
  adhesifs: 'Adhésifs', toiles: 'Toiles', baches: 'Bâches', panneaux: 'Panneaux',
  textile: 'Textile', papier: 'Papier', accessoires: 'Accessoires',
  supports_evenementiels: 'Supports évènementiels', vinyle_autocollant: 'Vinyle autocollant',
}

const getFeaturedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, category, product_type, price_per_m2, standard_sizes, image_url, images, available')
        .eq('available', true)
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
    <section className="bg-slate-50 py-24 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">NOS PRODUITS PHARES</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              Les indispensables<br className="hidden sm:block" /> pour vos projets.
            </h2>
          </div>
          <Link
            href="/catalogue"
            className="hidden md:flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            Voir tout le catalogue
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-slate-200 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-5 ${
            products.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
            products.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
            products.length === 3 ? 'grid-cols-2 md:grid-cols-3' :
            'grid-cols-2 md:grid-cols-4'
          }`}>
            {products.map((product) => {
              const img = product.image_url || product.images?.[0]
              const minPrice = product.price_per_m2
                ? `dès ${product.price_per_m2.toFixed(2)} € / m²`
                : product.standard_sizes?.length
                  ? `dès ${Math.min(...product.standard_sizes.filter(s => s.price > 0).map(s => s.price)).toFixed(2)} €`
                  : null
              return (
                <TiltCard key={product.id} intensity={10} scale={1.03} className="rounded-2xl">
                  <Link
                    href={`/produit/${product.id}`}
                    className="group block rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-shadow duration-500"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200">
                          <div className="w-12 h-12 rounded-2xl bg-slate-300/60 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Photo bientôt</span>
                        </div>
                      )}
                      {minPrice && (
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100 shadow-sm">
                          {minPrice}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                        Configurer <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              )
            })}
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link href="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600">
            Voir tout le catalogue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
