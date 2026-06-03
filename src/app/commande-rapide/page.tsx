import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CommandeRapideClient from '@/components/commande-rapide/CommandeRapideClient'

export const metadata: Metadata = {
  title: 'Commande rapide',
  description: 'Passez votre commande rapidement en ajoutant plusieurs lignes ou en important un fichier PDF.',
}

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
    const isStaff = ['admin', 'collaborateur', 'producteur'].includes(profile?.role ?? '')
    return { priceListId: account?.price_list_id ?? null, isStaff }
  } catch {
    return { priceListId: null, isStaff: false }
  }
}

export default async function CommandeRapidePage() {
  const [{ priceListId, isStaff }, supabase] = await Promise.all([
    getUserAccess(),
    createServiceClient(),
  ])

  const { data } = await supabase
    .from('products')
    .select('id, name, category, product_type, price_per_m2, standard_sizes, finitions, delai_options, sides_finitions, available, restricted_to_price_lists')
    .eq('available', true)
    .order('name')

  const products = (data ?? []).filter((p: any) => {
    if (isStaff) return true // Staff : accès total
    const restricted: string[] = p.restricted_to_price_lists ?? []
    if (restricted.length === 0) return true
    return priceListId ? restricted.includes(priceListId) : false
  })

  return <CommandeRapideClient products={products} />
}
