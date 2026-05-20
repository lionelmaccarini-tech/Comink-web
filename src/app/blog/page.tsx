import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Blog — Conseils impression grand format',
  description: 'Conseils, astuces et actualités sur l\'impression grand format professionnelle par l\'équipe Comink.',
}

const getPosts = unstable_cache(
  async () => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, published_at, tags')
        .eq('published', true)
        .order('published_at', { ascending: false })
      return data ?? []
    } catch { return [] }
  },
  ['blog-posts'],
  { revalidate: 600 }
)

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">BLOG</p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Conseils & actualités</h1>
          <p className="text-slate-400 mt-2">L'expertise Comink au service de vos projets d'impression.</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {posts.length === 0 ? (
          <p className="text-slate-500 text-center py-20">Articles à venir bientôt.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Link key={post.id} href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all overflow-hidden">
                {post.cover_image && (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <img src={post.cover_image} alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5">
                  {post.tags?.[0] && (
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{post.tags[0]}</span>
                  )}
                  <h2 className="font-extrabold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{post.excerpt}</p>}
                  <p className="text-xs text-slate-400 mt-3">{post.published_at ? formatDate(post.published_at) : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
