import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import CommandeRapideClient from '@/components/commande-rapide/CommandeRapideClient'

export const metadata: Metadata = {
  title: 'Commande rapide',
  description: 'Passez votre commande rapidement en ajoutant plusieurs lignes ou en important un fichier PDF.',
}

const getProducts = unstable_cache(
  async () => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, category, product_type, price_per_m2, standard_sizes, finitions, delai_options, sides_finitions, available')
        .eq('available', true)
        .order('name')
      return data ?? []
    } catch { return [] }
  },
  ['products-commande-rapide'],
  { revalidate: 300 }
)

export default async function CommandeRapidePage() {
  const products = await getProducts()
  return <CommandeRapideClient products={products} />
}
