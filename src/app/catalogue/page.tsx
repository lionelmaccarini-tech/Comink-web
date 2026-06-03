import { Suspense } from 'react'
import type { Metadata } from 'next'
import CatalogueClient from '@/components/catalogue/CatalogueClient'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

export const metadata: Metadata = {
  title: 'Catalogue — Tous nos produits',
  description: 'Banderoles, bâches, roll-up, adhésifs, drapeaux, panneaux… Découvrez toute notre gamme d\'impression grand format sur mesure et en taille standard.',
}

const STAFF_ROLES = ['admin', 'collaborateur', 'producteur']

// Récupère la price_list_id et le rôle du user connecté
async function getUserAccess(): Promise<{ priceListId: string | null; isStaff: boolean }> {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return { priceListId: null, isStaff: false }
    const supabase = await createServiceClient()
    const [{ data: account }, { data: profile }] = await Promise.all([
      supabase.from('client_accounts').select('price_list_id').eq('user_id', user.id).single(),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
    ])
    const isStaff = STAFF_ROLES.includes(profile?.role ?? '')
    return { priceListId: account?.price_list_id ?? null, isStaff }
  } catch {
    return { priceListId: null, isStaff: false }
  }
}

// Filtre les produits selon la price list — les staff voient tout
function filterProductsByAccess(products: any[], userPriceListId: string | null, isStaff: boolean): Product[] {
  if (isStaff) return products // Staff : accès total
  return products.filter(p => {
    const restricted: string[] = p.restricted_to_price_lists ?? []
    if (restricted.length === 0) return true
    if (!userPriceListId) return false
    return restricted.includes(userPriceListId)
  })
}

export default async function CataloguePage() {
  const [{ priceListId: userPriceListId, isStaff }, supabase] = await Promise.all([
    getUserAccess(),
    createServiceClient(),
  ])

  const { data } = await supabase
    .from('products')
    .select('id, name, category, product_type, price_per_m2, standard_sizes, image_url, images, available, restricted_to_price_lists')
    .eq('available', true)
    .order('name')

  const allProducts = (data ?? []) as any[]
  const products = filterProductsByAccess(allProducts, userPriceListId, isStaff)

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
