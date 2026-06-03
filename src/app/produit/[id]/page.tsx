import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ProduitClient from '@/components/produit/ProduitClient'
import type { Product } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

interface Props {
  params: Promise<{ id: string }>
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase.from('products').select('*').eq('id', id).single()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Produit introuvable' }

  const title       = product.seo_title || product.name
  const description = product.seo_description
    || product.description?.replace(/<[^>]+>/g, '').slice(0, 160)
    || `Découvrez ${product.name} — impression grand format professionnelle chez Comink, Liège.`
  const image       = product.image_url || `${SITE_URL}/og-default.jpg`
  const canonical   = `${SITE_URL}/produit/${product.id}`

  return {
    title,
    description,
    keywords: product.seo_keywords
      ? product.seo_keywords.split(',').map(k => k.trim())
      : undefined,
    alternates: { canonical },
    openGraph: {
      type:        'website',
      locale:      'fr_BE',
      siteName:    'Comink',
      url:         canonical,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [image],
    },
  }
}

export default async function ProduitPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  // ── Contrôle d'accès par price list ──────────────────────────────────────────
  const restricted: string[] = (product as any).restricted_to_price_lists ?? []
  if (restricted.length > 0) {
    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (!user) redirect(`/auth/login?redirect=/produit/${id}`)

      const supabase = await createServiceClient()
      const [{ data: profile }, { data: account }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('client_accounts').select('price_list_id').eq('user_id', user.id).single(),
      ])
      // Staff (admin/collaborateur/producteur) → accès total
      const isStaff = ['admin', 'collaborateur', 'producteur'].includes(profile?.role ?? '')
      if (!isStaff && (!account?.price_list_id || !restricted.includes(account.price_list_id))) {
        notFound()
      }
    } catch {
      notFound()
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // JSON-LD structured data (Product schema)
  const canonical = `${SITE_URL}/produit/${product.id}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.seo_description
      || product.description?.replace(/<[^>]+>/g, '').slice(0, 300)
      || product.name,
    image: product.images?.length ? product.images : product.image_url ? [product.image_url] : [],
    url: canonical,
    brand: { '@type': 'Brand', name: 'Comink' },
    offers: {
      '@type': 'Offer',
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceCurrency: 'EUR',
      url: canonical,
      seller: {
        '@type': 'Organization',
        name: 'Comink',
        url: SITE_URL,
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProduitClient product={product} />
    </>
  )
}
