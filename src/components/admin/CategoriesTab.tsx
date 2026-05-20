'use client'

import React, { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Check, X, Pencil, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Category {
  id: string
  label: string
  display_order: number
  active: boolean
}

interface Props {
  categories: Category[]
  onChange: (cats: Category[]) => void
}

export default function CategoriesTab({ categories, onChange }: Props) {
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── helpers ──────────────────────────────────────────────────────────────

  async function apiFetch(method: string, body?: object, qs?: string) {
    const url = '/api/admin/categories' + (qs ? `?${qs}` : '')
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erreur serveur')
    return json
  }

  function slugify(s: string) {
    return s.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  // ── add ──────────────────────────────────────────────────────────────────

  async function handleAdd() {
    const id = newId || slugify(newLabel)
    if (!id || !newLabel.trim()) { setError('Nom requis'); return }
    if (categories.find(c => c.id === id)) { setError('Identifiant déjà utilisé'); return }
    setSaving(true); setError(null)
    try {
      const maxOrder = Math.max(0, ...categories.map(c => c.display_order))
      const created = await apiFetch('POST', { id, label: newLabel.trim(), display_order: maxOrder + 1 })
      onChange([...categories, created])
      setNewId(''); setNewLabel(''); setAdding(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── rename ────────────────────────────────────────────────────────────────

  async function handleRename(cat: Category) {
    if (!editLabel.trim()) return
    setSaving(true); setError(null)
    try {
      const updated = await apiFetch('PUT', { id: cat.id, label: editLabel.trim() })
      onChange(categories.map(c => c.id === cat.id ? { ...c, label: updated.label } : c))
      setEditingId(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── toggle active ─────────────────────────────────────────────────────────

  async function handleToggle(cat: Category) {
    try {
      const updated = await apiFetch('PUT', { id: cat.id, active: !cat.active })
      onChange(categories.map(c => c.id === cat.id ? { ...c, active: updated.active } : c))
    } catch (e: any) { setError(e.message) }
  }

  // ── reorder ───────────────────────────────────────────────────────────────

  async function handleMove(cat: Category, dir: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(c => c.id === cat.id)
    const next = idx + dir
    if (next < 0 || next >= sorted.length) return

    // swap display_order values
    const a = sorted[idx]
    const b = sorted[next]
    const newOrder = a.display_order
    const otherOrder = b.display_order

    try {
      await Promise.all([
        apiFetch('PUT', { id: a.id, display_order: otherOrder }),
        apiFetch('PUT', { id: b.id, display_order: newOrder }),
      ])
      onChange(categories.map(c => {
        if (c.id === a.id) return { ...c, display_order: otherOrder }
        if (c.id === b.id) return { ...c, display_order: newOrder }
        return c
      }))
    } catch (e: any) { setError(e.message) }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(cat: Category) {
    if (!confirm(`Supprimer la catégorie "${cat.label}" ?`)) return
    setSaving(true); setError(null)
    try {
      await apiFetch('DELETE', undefined, `id=${cat.id}`)
      onChange(categories.filter(c => c.id !== cat.id))
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Catégories de produits</h2>
          <p className="text-sm text-slate-500 mt-0.5">{categories.length} catégorie{categories.length > 1 ? 's' : ''} — glissez les flèches pour réordonner</p>
        </div>
        <button
          onClick={() => { setAdding(true); setError(null) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nouvelle catégorie
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">Nouvelle catégorie</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom affiché *</label>
              <input
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ex: Kakémonos"
                value={newLabel}
                onChange={e => { setNewLabel(e.target.value); if (!newId) setNewId('') }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Identifiant <span className="font-normal text-slate-400">(auto si vide)</span>
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={slugify(newLabel) || 'kakemonos'}
                value={newId}
                onChange={e => setNewId(slugify(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setNewId(''); setNewLabel(''); setError(null) }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
              Annuler
            </button>
            <button onClick={handleAdd} disabled={saving || !newLabel.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Aucune catégorie</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left w-8">#</th>
                <th className="px-5 py-3 text-left">Nom</th>
                <th className="px-5 py-3 text-left">Identifiant</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((cat, idx) => (
                <tr key={cat.id} className={cn('hover:bg-slate-50 transition-colors', !cat.active && 'opacity-50')}>
                  {/* Order */}
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMove(cat, -1)} disabled={idx === 0}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMove(cat, 1)} disabled={idx === sorted.length - 1}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Label */}
                  <td className="px-5 py-3">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus
                          className="border border-blue-400 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(cat); if (e.key === 'Escape') setEditingId(null) }}
                        />
                        <button onClick={() => handleRename(cat)} disabled={saving}
                          className="text-green-600 hover:text-green-700 p-1 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-800">{cat.label}</span>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-5 py-3">
                    <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{cat.id}</code>
                  </td>

                  {/* Active toggle */}
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => handleToggle(cat)}
                      className={cn('transition-colors', cat.active ? 'text-green-500 hover:text-green-600' : 'text-slate-300 hover:text-slate-400')}
                      title={cat.active ? 'Visible — cliquer pour masquer' : 'Masquée — cliquer pour activer'}>
                      {cat.active
                        ? <ToggleRight className="w-7 h-7" />
                        : <ToggleLeft className="w-7 h-7" />}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditingId(cat.id); setEditLabel(cat.label); setError(null) }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Renommer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
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

      <p className="text-xs text-slate-400">
        💡 Les catégories désactivées ne sont plus proposées lors de la création de produits, mais les produits existants restent visibles.
        La suppression est bloquée si des produits utilisent encore cette catégorie.
      </p>
    </div>
  )
}
