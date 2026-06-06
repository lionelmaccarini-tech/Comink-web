'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Edit2, Trash2, Eye, Globe, FileText, Loader2, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false })

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  published: boolean
  published_at: string | null
  tags: string[]
  created_at: string
  reading_time_min: number | null
}

interface BlogPostFull extends BlogPost {
  content: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  author_name: string | null
}

// ─── Éditeur d'article ────────────────────────────────────────────────────────

function PostEditor({
  post,
  onSave,
  onClose,
}: {
  post: BlogPostFull | null
  onSave: (saved: BlogPost) => void
  onClose: () => void
}) {
  const isNew = !post
  const [title, setTitle]         = useState(post?.title ?? '')
  const [excerpt, setExcerpt]     = useState(post?.excerpt ?? '')
  const [content, setContent]     = useState(post?.content ?? '')
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? '')
  const [tags, setTags]           = useState((post?.tags ?? []).join(', '))
  const [author, setAuthor]       = useState(post?.author_name ?? 'Équipe Comink')
  const [seoTitle, setSeoTitle]   = useState(post?.seo_title ?? '')
  const [seoDesc, setSeoDesc]     = useState(post?.seo_description ?? '')
  const [seoKw, setSeoKw]         = useState(post?.seo_keywords ?? '')
  const [published, setPublished] = useState(post?.published ?? false)
  const [saving, setSaving]       = useState(false)
  const [showSeo, setShowSeo]     = useState(false)

  // ── Génération IA ──────────────────────────────────────────────────────────
  const [showAI, setShowAI]           = useState(isNew)
  const [aiTopic, setAiTopic]         = useState('')
  const [aiKeywords, setAiKeywords]   = useState('')
  const [aiTone, setAiTone]           = useState<'chaleureux' | 'expert' | 'simple'>('chaleureux')
  const [aiLength, setAiLength]       = useState<'court' | 'moyen' | 'long'>('moyen')
  const [generating, setGenerating]   = useState(false)

  const generate = useCallback(async () => {
    if (!aiTopic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords, tone: aiTone, length: aiLength }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      if (data.title)       setTitle(data.title)
      if (data.content)     setContent(data.content)
      if (data.excerpt)     setExcerpt(data.excerpt)
      if (data.seo_title)   setSeoTitle(data.seo_title)
      if (data.seo_description) setSeoDesc(data.seo_description)
      if (data.seo_keywords)    setSeoKw(data.seo_keywords)
      if (data.tags?.length)    setTags(data.tags.join(', '))
      setShowAI(false)
    } catch (e: any) {
      alert(`Erreur génération : ${e.message}`)
    } finally {
      setGenerating(false)
    }
  }, [aiTopic, aiKeywords, aiTone, aiLength])

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (publish?: boolean) => {
    if (!title.trim()) return alert('Le titre est requis.')
    setSaving(true)
    try {
      const payload = {
        title:           title.trim(),
        excerpt:         excerpt.trim() || null,
        content:         content || null,
        cover_image:     coverImage.trim() || null,
        tags:            tags.split(',').map(t => t.trim()).filter(Boolean),
        author_name:     author.trim() || 'Équipe Comink',
        seo_title:       seoTitle.trim() || null,
        seo_description: seoDesc.trim() || null,
        seo_keywords:    seoKw.trim() || null,
        published:       publish !== undefined ? publish : published,
      }
      const url    = isNew ? '/api/admin/blog' : `/api/admin/blog/${post!.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      if (publish !== undefined) setPublished(publish)
      onSave(data)
    } catch (e: any) {
      alert(`Erreur sauvegarde : ${e.message}`)
    } finally {
      setSaving(false)
    }
  }, [title, excerpt, content, coverImage, tags, author, seoTitle, seoDesc, seoKw, published, isNew, post, onSave])

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-stretch justify-end">
      <div className="w-full max-w-4xl bg-white flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-extrabold text-slate-800">
            {isNew ? '✏️ Nouvel article' : `Modifier : ${post!.title}`}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Enregistrer brouillon'}
            </button>
            <button
              onClick={() => handleSave(!published)}
              disabled={saving}
              className={`px-4 py-2 text-sm font-bold rounded-lg disabled:opacity-50 transition-colors ${
                published
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {published ? '⏸ Dépublier' : '🚀 Publier'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Générateur IA ── */}
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAI(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-violet-800"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> ✨ Générer avec Claude
              </span>
              {showAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAI && (
              <div className="px-4 pb-4 space-y-3 border-t border-violet-100">
                <p className="text-[11px] text-violet-600 pt-3">
                  Décris le sujet de l'article. Claude rédige le contenu complet, le SEO et les tags.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sujet *</label>
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
                    placeholder="Ex: Comment choisir le bon support pour une bâche extérieure ?"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mots-clés à inclure</label>
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
                    placeholder="Ex: bâche grand format, impression Liège, résistant intempéries"
                    value={aiKeywords}
                    onChange={e => setAiKeywords(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ton</label>
                    <select value={aiTone} onChange={e => setAiTone(e.target.value as any)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="chaleureux">Chaleureux & professionnel</option>
                      <option value="expert">Expert & technique</option>
                      <option value="simple">Simple & pédagogique</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longueur</label>
                    <select value={aiLength} onChange={e => setAiLength(e.target.value as any)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="court">Court (400-600 mots)</option>
                      <option value="moyen">Moyen (600-900 mots)</option>
                      <option value="long">Long (1000-1400 mots)</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={generate}
                  disabled={generating || !aiTopic.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Générer l'article</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titre *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'article"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Extrait */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Extrait</label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Résumé court affiché dans la liste des articles (2-3 phrases)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contenu</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>

          {/* Image de couverture + Tags + Auteur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Image de couverture (URL)</label>
              <input
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                placeholder="https://…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {coverImage && (
                <img src={coverImage} alt="" className="mt-2 h-20 w-full object-cover rounded-lg border border-slate-200" />
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tags (séparés par virgule)</label>
                <input
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="impression, bâche, Liège"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Auteur</label>
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="Équipe Comink"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEO (repliable) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSeo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <span>🔍 SEO {seoTitle || seoDesc ? '✓' : ''}</span>
              {showSeo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSeo && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre SEO</label>
                    <span className={`text-[11px] font-semibold ${seoTitle.length > 60 ? 'text-red-500' : 'text-slate-400'}`}>{seoTitle.length}/60</span>
                  </div>
                  <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={title || 'Titre pour Google'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meta description</label>
                    <span className={`text-[11px] font-semibold ${seoDesc.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>{seoDesc.length}/160</span>
                  </div>
                  <textarea rows={2} value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Description affichée dans Google…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mots-clés</label>
                  <input value={seoKw} onChange={e => setSeoKw(e.target.value)} placeholder="impression, grand format, Liège"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab principal Blog ───────────────────────────────────────────────────────

export default function BlogTab() {
  const [posts, setPosts]         = useState<BlogPost[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<BlogPostFull | null | 'new'>('new' as any)
  const [editorOpen, setEditorOpen] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blog')
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = async (post: BlogPost) => {
    try {
      // Charger le contenu complet
      const res = await fetch(`/api/admin/blog/${post.id}`)
      if (res.ok) {
        const full = await res.json()
        setEditing(full)
      } else {
        setEditing(post as BlogPostFull)
      }
    } catch {
      setEditing(post as BlogPostFull)
    }
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ? Action irréversible.')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    setPosts(p => p.filter(x => x.id !== id))
  }

  const handleSaved = (saved: BlogPost) => {
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...saved }
        return next
      }
      return [saved, ...prev]
    })
    setEditorOpen(false)
  }

  const published = posts.filter(p => p.published).length
  const drafts    = posts.filter(p => !p.published).length

  return (
    <div className="space-y-5">
      {/* Stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm text-center min-w-[80px]">
            <p className="text-2xl font-extrabold text-green-600">{published}</p>
            <p className="text-[11px] text-slate-500 font-semibold">Publiés</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm text-center min-w-[80px]">
            <p className="text-2xl font-extrabold text-slate-400">{drafts}</p>
            <p className="text-[11px] text-slate-500 font-semibold">Brouillons</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nouvel article
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold mb-1">Aucun article</p>
            <p className="text-sm text-slate-400 mb-4">Créez votre premier article de blog avec l'IA</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2 rounded-xl text-sm">
              <Sparkles className="w-4 h-4" /> Générer mon premier article
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Article</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Tags</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 line-clamp-1">{post.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
                        : `Créé le ${new Date(post.created_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}`}
                      {post.reading_time_min ? ` · ${post.reading_time_min} min` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${
                      post.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {post.published ? <><Globe className="w-3 h-3" /> Publié</> : <><FileText className="w-3 h-3" /> Brouillon</>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.published && (
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600" title="Voir">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => openEdit(post)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(post.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Éditeur */}
      {editorOpen && (
        <PostEditor
          post={editing as BlogPostFull | null}
          onSave={handleSaved}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}
