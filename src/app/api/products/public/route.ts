import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET /api/products/public — produits filtrés selon la price list du user connecté
// Les staff voient tout, les non-connectés ne voient que les produits sans restriction
export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Récupérer tous les produits disponibles
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, category, available, restricted_to_price_lists')
      .eq('available', true)
      .order('name')

    if (!allProducts) return NextResponse.json([])

    // Vérifier l'utilisateur connecté
    let priceListId: string | null = null
    let isStaff = false

    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const [{ data: profile }, { data: account }] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).single(),
          supabase.from('client_accounts').select('price_list_id').eq('user_id', user.id).single(),
        ])
        isStaff = ['admin', 'collaborateur', 'producteur'].includes(profile?.role ?? '')
        priceListId = account?.price_list_id ?? null
      }
    } catch { /* non connecté */ }

    const filtered = allProducts.filter(p => {
      if (isStaff) return true
      const restricted: string[] = p.restricted_to_price_lists ?? []
      if (restricted.length === 0) return true
      return priceListId ? restricted.includes(priceListId) : false
    })

    return NextResponse.json(filtered)
  } catch (err) {
    console.error('[products/public]', err)
    return NextResponse.json([])
  }
}
