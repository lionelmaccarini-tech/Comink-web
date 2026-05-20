import { Suspense } from 'react'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import CatalogueClient from '@/components/catalogue/CatalogueClient'
import { createPublicClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

export const metadata: Metadata = {
  title: 'Catalogue — Tous nos produits',
  description: 'Banderoles, bâches, roll-up, adhésifs, drapeaux, panneaux… Découvrez toute notre gamme d\'impression grand format sur mesure et en taille standard.',
}

const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, category, product_type, price_per_m2, standard_sizes, image_url, images, available')
        .eq('available', true)
        .order('name')
      return (data ?? []) as Product[]
    } catch {
      return []
    }
  },
  ['products-catalogue'],
  { revalidate: 300 }
)

export default async function CataloguePage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">CATALOGUE</p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Tous nos produits</h1>
          <p className="text-slate-400 mt-2">Impression grand format sur mesure et taille standard.</p>
        </div>
      </div>
      <Suspense fallback={<div className="animate-pulse p-8" />}>
        <CatalogueClient initialProducts={products} />
      </Suspense>
    </div>
  )
}
