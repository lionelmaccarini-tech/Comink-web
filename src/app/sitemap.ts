import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServiceClient()

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/catalogue`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/devis`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${SITE_URL}/mentions-legales`,lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // Produits disponibles
  let productPages: MetadataRoute.Sitemap = []
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('available', true)
    if (products) {
      productPages = products.map(p => ({
        url:             `${SITE_URL}/produit/${p.id}`,
        lastModified:    new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority:        0.8,
      }))
    }
  } catch { /* ignore */ }

  // Articles de blog
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
    if (posts) {
      blogPages = posts.map(p => ({
        url:             `${SITE_URL}/blog/${p.slug}`,
        lastModified:    new Date(p.updated_at),
        changeFrequency: 'monthly' as const,
        priority:        0.5,
      }))
    }
  } catch { /* ignore */ }

  return [...staticPages, ...productPages, ...blogPages]
}
