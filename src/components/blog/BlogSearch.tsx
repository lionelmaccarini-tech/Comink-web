'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, Tag } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  published_at: string | null
  tags: string[] | null
}

interface BlogSearchProps {
  posts: BlogPost[]
}

export default function BlogSearch({ posts }: BlogSearchProps) {
  const [query, setQuery]         = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Gather all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of posts) {
      for (const t of p.tags ?? []) set.add(t)
    }
    return [...set].sort()
  }, [posts])

  // Filter posts
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return posts.filter((p) => {
      const matchTag = activeTag ? p.tags?.includes(activeTag) : true
      if (!q) return matchTag
      const inTitle   = p.title.toLowerCase().includes(q)
      const inExcerpt = (p.excerpt ?? '').toLowerCase().includes(q)
      const inTags    = p.tags?.some(t => t.toLowerCase().includes(q)) ?? false
      return matchTag && (inTitle || inExcerpt || inTags)
    })
  }, [posts, query, activeTag])

  return (
    <div className="space-y-8">
      {/* ── Search bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Rechercher un article…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Result count */}
        {(query || activeTag) && (
          <div className="flex items-center text-sm text-slate-500 whitespace-nowrap">
            <span className="font-semibold text-slate-700">{filtered.length}</span>
            &nbsp;résultat{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Tag filters ── */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeTag === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            Tous
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeTag === tag
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Results grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucun article trouvé</p>
          <p className="text-sm text-slate-400 mt-1">Essayez avec d'autres mots-clés ou supprimez le filtre actif.</p>
          {(query || activeTag) && (
            <button
              onClick={() => { setQuery(''); setActiveTag(null) }}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all overflow-hidden"
            >
              {post.cover_image && (
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-5">
                {post.tags?.[0] && (
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {post.tags[0]}
                  </span>
                )}
                <h2 className="font-extrabold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {/* Highlight matching query */}
                  {query ? <HighlightText text={post.title} query={query} /> : post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  {post.published_at ? formatDate(post.published_at) : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple text highlight component
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
          : part,
      )}
    </>
  )
}
