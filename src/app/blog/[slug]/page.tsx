import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string) {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
    return data
  } catch { return null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Article introuvable' }
  return {
    title:       post.seo_title || `${post.title} — Comink`,
    description: post.seo_description || post.excerpt || undefined,
    keywords:    post.seo_keywords || undefined,
    openGraph: {
      title:       post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      images:      post.cover_image ? [post.cover_image] : undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      {/* Hero */}
      <div className="text-white" style={{ background: '#0d1f38' }}>
        {post.cover_image && (
          <div className="w-full h-64 md:h-80 overflow-hidden">
            <img src={post.cover_image} alt={post.title}
              className="w-full h-full object-cover opacity-40" />
          </div>
        )}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string, i: number) => {
                const cmykColors = ['#00AEEF', '#E8001A', '#F5C400', '#00AEEF']
                const color = cmykColors[i % cmykColors.length]
                return (
                  <span
                    key={tag}
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
                  >{tag}</span>
                )
              })}
            </div>
          )}
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{post.title}</h1>
          <div className="flex items-center gap-4 mt-4 text-slate-400 text-sm">
            {post.author_name && <span>{post.author_name}</span>}
            {post.published_at && <span>·</span>}
            {post.published_at && <span>{formatDate(post.published_at)}</span>}
            {post.reading_time_min && <span>·</span>}
            {post.reading_time_min && <span>{post.reading_time_min} min de lecture</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {post.excerpt && (
          <p className="text-lg text-slate-300 leading-relaxed pl-4 mb-8 italic" style={{ borderLeft: '4px solid #00AEEF' }}>
            {post.excerpt}
          </p>
        )}
        {post.content && (
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}

        {/* Back + CTA */}
        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Link href="/blog" className="text-sm font-semibold hover:underline" style={{ color: '#00AEEF' }}>
            ← Retour au blog
          </Link>
          <Link
            href="/commande-rapide"
            className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-90"
            style={{ background: '#00AEEF', color: 'white' }}
          >
            ⚡ Commander en ligne
          </Link>
        </div>
      </div>
    </div>
  )
}
