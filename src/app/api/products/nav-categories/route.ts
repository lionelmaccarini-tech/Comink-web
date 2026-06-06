import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'

export const revalidate = 300 // cache 5 min

export async function GET() {
  try {
    const supabase = createPublicClient()

    // Catégories configurées en admin (id + label + ordre)
    const { data: cats } = await supabase
      .from('categories')
      .select('id, label, display_order')
      .eq('active', true)
      .order('display_order', { ascending: true })

    const catMap: Record<string, string> = {}
    for (const c of cats ?? []) catMap[c.id] = c.label

    // Produits disponibles → quelles catégories par type
    const { data: products } = await supabase
      .from('products')
      .select('category, product_type')
      .eq('available', true)

    const surMesureSet = new Set<string>()
    const tailleStandardSet = new Set<string>()

    for (const p of products ?? []) {
      if (!p.category) continue
      if (p.product_type === 'sur_mesure') surMesureSet.add(p.category)
      if (p.product_type === 'taille_standard') tailleStandardSet.add(p.category)
    }

    // Trier selon display_order des catégories
    const catOrder = (cats ?? []).map((c: any) => c.id)
    const sortByCatOrder = (ids: string[]) =>
      ids.sort((a, b) => {
        const ia = catOrder.indexOf(a)
        const ib = catOrder.indexOf(b)
        if (ia === -1 && ib === -1) return a.localeCompare(b)
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })

    const toList = (set: Set<string>) =>
      sortByCatOrder([...set]).map(id => ({
        id,
        label: catMap[id] || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      }))

    return NextResponse.json({
      sur_mesure: toList(surMesureSet),
      taille_standard: toList(tailleStandardSet),
    })
  } catch (err: any) {
    return NextResponse.json({ sur_mesure: [], taille_standard: [] }, { status: 500 })
  }
}
