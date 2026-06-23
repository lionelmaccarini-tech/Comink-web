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

function filterProductsByAccess(products: any[], userPriceListId: string | null, isStaff: boolean): Product[] {
  if (isStaff) return products
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

  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, category, product_type, price_per_m2, standard_sizes, image_url, images, available, restricted_to_price_lists')
      .eq('available', true)
      .order('name'),
    supabase
      .from('categories')
      .select('id, label')
      .eq('active', true),
  ])

  const categoryLabels: Record<string, string> = {}
  for (const c of cats ?? []) categoryLabels[c.id] = c.label

  const allProducts = (data ?? []) as any[]
  const products = filterProductsByAccess(allProducts, userPriceListId, isStaff)

  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      {/* Hero */}
      <div className="text-white relative overflow-hidden" style={{ background: '#060e1f' }}>
        {/* Ligne CMYK */}
        <div className="absolute top-0 left-0 right-0 h-[3px] flex">
          <div className="flex-1" style={{ background: '#00AEEF' }} />
          <div className="flex-1" style={{ background: '#E8001A' }} />
          <div className="flex-1" style={{ background: '#F5C400' }} />
        </div>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: '#00AEEF' }}>◆ CATALOGUE</p>
          <h1 className="text-3xl md:text-4xl font-black">Tous nos produits</h1>
          <div className="h-[3px] rounded-full mt-4 w-12" style={{ background: '#F5C400' }} />
          <p className="mt-3 font-semibold" style={{ color: "#cbd5e1" }}>Impression grand format sur mesure et taille standard.</p>
        </div>
      </div>
      <Suspense fallback={<div className="animate-pulse p-8" />}>
        <CatalogueClient initialProducts={products} categoryLabels={categoryLabels} />
      </Suspense>
    </div>
  )
}
