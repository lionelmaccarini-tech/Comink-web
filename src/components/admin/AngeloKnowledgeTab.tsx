'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Brain, Plus, Search, Pencil, Trash2, Check, X, Eye, EyeOff,
  AlertCircle, Tag, Loader2, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeItem {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  source: string
  source_ref: string | null
  is_active: boolean
  approved: boolean
  created_at: string
}

const CATEGORIES = [
  { id: 'all',         label: 'Toutes' },
  { id: 'produits',    label: 'Produits' },
  { id: 'matériaux',   label: 'Matériaux' },
  { id: 'formats',     label: 'Formats' },
  { id: 'finitions',   label: 'Finitions' },
  { id: 'délais',      label: 'Délais' },
  { id: 'prix',        label: 'Prix' },
  { id: 'commande',    label: 'Commande' },
  { id: 'livraison',   label: 'Livraison' },
  { id: 'pose',        label: 'Pose / Installation' },
  { id: 'faq',         label: 'FAQ' },
  { id: 'general',     label: 'Général' },
]

const SOURCE_LABELS: Record<string, string> = {
  manual:       'Manuel',
  blog:         'Blog',
  conversation: 'Conversation',
}

const emptyItem = {
  category: 'general', question: '', answer: '', keywords: '', source_ref: '',
}

export default function AngeloKnowledgeTab() {
  const [items, setItems]               = useState<KnowledgeItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('all')
  const [filterApproved, setFilterApproved] = useState<'all' | 'pending'>('all')

  // Create / Edit form
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<KnowledgeItem | null>(null)
  const [form, setForm]                 = useState(emptyItem)
  const [saving, setSaving]             = useState(false)

  // Expanded rows
  const [expanded, setExpanded]         = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/angelo-knowledge')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Stats
  const stats = useMemo(() => ({
    total:   items.length,
    active:  items.filter(i => i.is_active && i.approved).length,
    pending: items.filter(i => !i.approved).length,
    byCategory: CATEGORIES.slice(1).map(c => ({
      ...c, count: items.filter(i => i.category === c.id).length,
    })).filter(c => c.count > 0),
  }), [items])

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(item => {
      if (filterCat !== 'all' && item.category !== filterCat) return false
      if (filterApproved === 'pending' && item.approved) return false
      if (!q) return true
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.keywords.some(k => k.toLowerCase().includes(q))
      )
    })
  }, [items, search, filterCat, filterApproved])

  function openCreate() {
    setEditing(null)
    setForm(emptyItem)
    setShowForm(true)
  }

  function openEdit(item: KnowledgeItem) {
    setEditing(item)
    setForm({
      category:   item.category,
      question:   item.question,
      answer:     item.answer,
      keywords:   item.keywords.join(', '),
      source_ref: item.source_ref ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    try {
      const payload = {
        category:   form.category,
        question:   form.question.trim(),
        answer:     form.answer.trim(),
        keywords:   form.keywords.split(',').map(k => k.trim()).filter(Boolean),
        source:     editing ? editing.source : 'manual',
        source_ref: form.source_ref || null,
        approved:   true,
        is_active:  true,
      }
      if (editing) {
        await fetch(`/api/admin/angelo-knowledge/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/admin/angelo-knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée de la base de connaissances ?')) return
    await fetch(`/api/admin/angelo-knowledge/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function toggleActive(item: KnowledgeItem) {
    await fetch(`/api/admin/angelo-knowledge/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  async function handleApprove(item: KnowledgeItem) {
    await fetch(`/api/admin/angelo-knowledge/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, is_active: true }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, approved: true, is_active: true } : i))
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const catLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label ?? id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            Base de connaissances Angelo
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Questions/réponses génériques qu'Angelo utilise pour aider les clients.
            Aucune donnée client — uniquement informations produits et processus.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter une entrée
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} color="slate" />
        <StatCard label="Actives" value={stats.active} color="green" />
        <StatCard label="En attente" value={stats.pending} color="amber" />
        <StatCard label="Catégories" value={stats.byCategory.length} color="violet" />
      </div>

      {/* Pending approval banner */}
      {stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.pending}</strong> entrée{stats.pending > 1 ? 's' : ''} suggérée{stats.pending > 1 ? 's' : ''} par Angelo en attente de validation.
          </p>
          <button
            onClick={() => setFilterApproved('pending')}
            className="ml-auto text-xs font-bold text-amber-700 hover:underline"
          >
            Voir
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Rechercher dans les connaissances…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select
          value={filterApproved}
          onChange={e => setFilterApproved(e.target.value as 'all' | 'pending')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">
                {editing ? 'Modifier l\'entrée' : 'Nouvelle entrée de connaissance'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORIES.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Ex: Comment poser un adhésif mural ?"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Réponse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  rows={6}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                  placeholder="Réponse complète et précise…"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mots-clés <span className="text-slate-400 font-normal">(séparés par des virgules)</span>
                </label>
                <input
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="adhésif, pose, installation, vinyle"
                />
              </div>
              {editing?.source === 'blog' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slug article source</label>
                  <input
                    value={form.source_ref}
                    onChange={e => setForm(f => ({ ...f, source_ref: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.question.trim() || !form.answer.trim()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-bold rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge list */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune entrée trouvée</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez des connaissances pour qu'Angelo puisse mieux répondre aux clients.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const isExpanded = expanded.has(item.id)
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white border rounded-xl overflow-hidden transition-all',
                  !item.is_active && 'opacity-60',
                  !item.approved ? 'border-amber-300 bg-amber-50' : 'border-slate-200',
                )}
              >
                <div className="p-4 flex items-start gap-3">
                  {/* Category badge */}
                  <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-violet-700 bg-violet-100 rounded-full px-2 py-0.5">
                    {catLabel(item.category)}
                  </span>

                  {/* Question + expand */}
                  <button
                    className="flex-1 text-left"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{item.question}</p>
                    {!isExpanded && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.answer}</p>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!item.approved && (
                      <button
                        onClick={() => handleApprove(item)}
                        className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors"
                        title="Approuver"
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title={item.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded answer */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Réponse</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.answer}</p>
                    </div>
                    {item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map(k => (
                          <span key={k} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            <Tag className="w-3 h-3" /> {k}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Source : {SOURCE_LABELS[item.source] ?? item.source}</span>
                      {item.source_ref && <span>Réf : {item.source_ref}</span>}
                      <span>
                        {!item.approved
                          ? '⏳ En attente de validation'
                          : item.is_active
                            ? '✅ Active'
                            : '⏸️ Désactivée'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate:  'bg-slate-50  text-slate-800  border-slate-200',
    green:  'bg-green-50  text-green-800  border-green-200',
    amber:  'bg-amber-50  text-amber-800  border-amber-200',
    violet: 'bg-violet-50 text-violet-800 border-violet-200',
  }
  return (
    <div className={cn('border rounded-xl p-4 text-center', colors[color])}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-70">{label}</p>
    </div>
  )
}
