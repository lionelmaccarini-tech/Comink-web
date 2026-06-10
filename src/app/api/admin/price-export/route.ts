import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// ── Calcul du prix net après application des règles tarif ──────────────────
function applyPriceListRules(
  basePrice: number,
  productId: string,
  category: string,
  priceList: { discount_percent: number; rules?: any[] },
): number {
  const rules = priceList.rules ?? []

  // 1. Règle produit spécifique
  const productRule = rules.find(
    (r: any) => r.rule_type === 'product' && r.product_id === productId,
  )
  if (productRule) {
    if (productRule.custom_price_per_m2 != null) return productRule.custom_price_per_m2
    if (productRule.discount_percent != null)
      return round2(basePrice * (1 - productRule.discount_percent / 100))
  }

  // 2. Règle catégorie
  const catRule = rules.find(
    (r: any) => r.rule_type === 'category' && r.category === category,
  )
  if (catRule) {
    if (catRule.discount_percent != null)
      return round2(basePrice * (1 - catRule.discount_percent / 100))
  }

  // 3. Remise globale liste
  if (priceList.discount_percent > 0)
    return round2(basePrice * (1 - priceList.discount_percent / 100))

  return basePrice
}

// Supplement finitions par défaut (en € HT, par unité ou par m²)
function defaultFinitionsSupplement(finitions: any[]): number {
  if (!finitions?.length) return 0
  let total = 0
  for (const group of finitions) {
    for (const opt of group.options ?? []) {
      if (opt.default_selected && opt.price_supplement > 0) {
        // On additionne uniquement les fixed / per_m2 (percent c'est compliqué sans surface)
        if (opt.price_type === 'fixed' || opt.price_type === 'per_m2') {
          total += opt.price_supplement
        }
      }
    }
  }
  return round2(total)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// GET /api/admin/price-export?price_list_id=xxx  OU  ?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const priceListId = searchParams.get('price_list_id')
    const clientId    = searchParams.get('client_id')

    if (!priceListId && !clientId) {
      return NextResponse.json({ error: 'price_list_id ou client_id requis' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // ── Résoudre price list & client ────────────────────────────────────────
    let priceList: any = null
    let client: any    = null

    if (clientId) {
      const { data: ca } = await supabase
        .from('client_accounts')
        .select('id, name, email, discount_percent, price_list_id')
        .eq('id', clientId)
        .single()
      client = ca
      if (ca?.price_list_id) {
        const { data: pl } = await supabase
          .from('price_lists')
          .select('*, rules:price_list_rules(*)')
          .eq('id', ca.price_list_id)
          .single()
        priceList = pl
      }
    }

    if (priceListId && !priceList) {
      const { data: pl } = await supabase
        .from('price_lists')
        .select('*, rules:price_list_rules(*)')
        .eq('id', priceListId)
        .single()
      priceList = pl
    }

    // Remise à appliquer quand pas de price_list (remise client directe)
    const directDiscount = client?.discount_percent ?? 0

    // ── Produits disponibles pour cette liste ──────────────────────────────
    let query = supabase
      .from('products')
      .select('id, name, category, product_type, price_per_m2, standard_sizes, finitions, delai_options, vat_rate, available, image_url, min_width_cm, min_height_cm, max_width_cm, max_height_cm, restricted_to_price_lists')
      .eq('available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    const { data: allProducts } = await query
    const products = (allProducts ?? []).filter((p: any) => {
      const restricted: string[] = p.restricted_to_price_lists ?? []
      if (restricted.length === 0) return true
      if (!priceList) return false
      return restricted.includes(priceList.id)
    })

    // ── Calculer les prix pour chaque produit ──────────────────────────────
    const rows = products.map((p: any) => {
      const finitionSupp = defaultFinitionsSupplement(p.finitions ?? [])
      const vatRate: number = p.vat_rate ?? 21

      if (p.product_type === 'taille_standard') {
        const sizes = (p.standard_sizes ?? []).map((s: any) => {
          const basePrice: number = s.price ?? 0
          let netPrice: number

          if (priceList) {
            // Pour standard, on applique la remise sur le prix unitaire
            // La custom_price_per_m2 n'a pas de sens direct → on convertit
            const rules = priceList.rules ?? []
            const productRule = rules.find(
              (r: any) => r.rule_type === 'product' && r.product_id === p.id,
            )
            const catRule = rules.find(
              (r: any) => r.rule_type === 'category' && r.category === p.category,
            )
            if (productRule?.custom_price_per_m2 != null) {
              // Recalculer à partir du custom $/m²
              const surfaceM2 = ((s.width_cm ?? 100) / 100) * ((s.height_cm ?? 100) / 100)
              netPrice = round2(productRule.custom_price_per_m2 * surfaceM2)
            } else if (productRule?.discount_percent != null) {
              netPrice = round2(basePrice * (1 - productRule.discount_percent / 100))
            } else if (catRule?.discount_percent != null) {
              netPrice = round2(basePrice * (1 - catRule.discount_percent / 100))
            } else if (priceList.discount_percent > 0) {
              netPrice = round2(basePrice * (1 - priceList.discount_percent / 100))
            } else {
              netPrice = basePrice
            }
          } else if (directDiscount > 0) {
            netPrice = round2(basePrice * (1 - directDiscount / 100))
          } else {
            netPrice = basePrice
          }

          const netWithFinitions = round2(netPrice + finitionSupp)
          const surfaceM2 = ((s.width_cm ?? 100) / 100) * ((s.height_cm ?? 100) / 100)
          const pricePerM2 = surfaceM2 > 0 ? round2(netWithFinitions / surfaceM2) : null

          return {
            name:          s.name ?? s.label ?? `${s.width_cm}×${s.height_cm} cm`,
            width_cm:      s.width_cm,
            height_cm:     s.height_cm,
            price_raw:     basePrice,
            price_net:     netWithFinitions,
            price_per_m2:  pricePerM2,
            price_ttc:     round2(netWithFinitions * (1 + vatRate / 100)),
          }
        })

        return {
          id:             p.id,
          name:           p.name,
          category:       p.category,
          product_type:   'taille_standard' as const,
          vat_rate:       vatRate,
          image_url:      p.image_url,
          finition_supp:  finitionSupp,
          sizes,
        }
      }

      // ── Sur mesure ──────────────────────────────────────────────────────
      const baseM2: number = p.price_per_m2 ?? 0
      let netM2: number

      if (priceList) {
        netM2 = applyPriceListRules(baseM2, p.id, p.category, priceList)
      } else if (directDiscount > 0) {
        netM2 = round2(baseM2 * (1 - directDiscount / 100))
      } else {
        netM2 = baseM2
      }

      const netM2WithFinitions = round2(netM2 + finitionSupp)

      // Référence 1 m² et dimensions min
      const refW = p.min_width_cm ?? 100
      const refH = p.min_height_cm ?? 100
      const refSurface = (refW / 100) * (refH / 100)
      const refPriceNet = round2(netM2WithFinitions * refSurface)

      return {
        id:              p.id,
        name:            p.name,
        category:        p.category,
        product_type:    'sur_mesure' as const,
        vat_rate:        vatRate,
        image_url:       p.image_url,
        finition_supp:   finitionSupp,
        price_per_m2_raw: baseM2,
        price_per_m2_net: netM2WithFinitions,
        price_per_m2_ttc: round2(netM2WithFinitions * (1 + vatRate / 100)),
        // Taille mini comme référence
        ref_width_cm:    refW,
        ref_height_cm:   refH,
        ref_price_net:   refPriceNet,
        ref_price_ttc:   round2(refPriceNet * (1 + vatRate / 100)),
        max_width_cm:    p.max_width_cm,
        max_height_cm:   p.max_height_cm,
      }
    })

    // Regrouper par catégorie
    const byCategory: Record<string, any[]> = {}
    for (const row of rows) {
      if (!byCategory[row.category]) byCategory[row.category] = []
      byCategory[row.category].push(row)
    }

    const appliedDiscount = priceList?.discount_percent ?? directDiscount ?? 0

    return NextResponse.json({
      client:            client ?? null,
      price_list:        priceList ?? null,
      applied_discount:  appliedDiscount,
      products:          rows,
      by_category:       byCategory,
      generated_at:      new Date().toISOString(),
    })
  } catch (err) {
    console.error('[price-export]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
