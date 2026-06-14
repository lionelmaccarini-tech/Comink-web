import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import BlogSearch from '@/components/blog/BlogSearch'

export const metadata: Metadata = {
  title: 'Blog — Conseils impression grand format',
  description: "Conseils, astuces et actualités sur l'impression grand format professionnelle par l'équipe Comink.",
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
  { revalidate: 600 },
)

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      {/* Hero */}
      <div className="text-white py-12" style={{ background: '#0d1f38' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#00AEEF' }}>BLOG</p>
          <h1 className="text-3xl md:text-4xl font-black text-white">Conseils &amp; actualités</h1>
          <p className="text-slate-300 mt-2">L'expertise Comink au service de vos projets d'impression.</p>
        </div>
      </div>

      {/* Content with search */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {posts.length === 0 ? (
          <p className="text-slate-400 text-center py-20">Articles à venir bientôt.</p>
        ) : (
          <BlogSearch posts={posts} />
        )}
      </div>
    </div>
  )
}
