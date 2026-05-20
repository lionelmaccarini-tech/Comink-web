import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

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
        .order('created_at', { ascending: false })
        .limit(4)
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
    <section className="bg-blue-100 py-16 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">NOS PRODUITS PHARES</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Les indispensables<br />pour vos projets.
            </h2>
          </div>
          <Link href="/catalogue" className="hidden md:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            Voir tous les produits <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-slate-200 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product) => {
              const img = product.image_url || product.images?.[0]
              const minPrice = product.price_per_m2
                ? `dès ${product.price_per_m2.toFixed(2)} € / m²`
                : product.standard_sizes?.length
                  ? `dès ${Math.min(...product.standard_sizes.filter(s => s.price > 0).map(s => s.price)).toFixed(2)} €`
                  : null
              return (
                <Link
                  key={product.id}
                  href={`/produit/${product.id}`}
                  className="group rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all bg-white"
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
                    <p className="text-xs text-slate-400">{CATEGORY_LABELS[product.category] || product.category}</p>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mt-0.5">{product.name}</h3>
                    {minPrice && <p className="text-xs font-bold text-blue-600 mt-1">{minPrice}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-6 md:hidden text-center">
          <Link href="/catalogue" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
            Voir tous les produits <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
