'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, GripVertical, RefreshCw, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Status {
  id: string
  name: string
  color: string
  sort_order: number
  is_initial: boolean
  is_final: boolean
}

interface StaffMember {
  id: string
  full_name: string
  role: string
}

export default function ProductionTab() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Settings
  const [dueDays, setDueDays] = useState('7')
  const [autoAssignId, setAutoAssignId] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  async function loadStatuses() {
    setLoading(true)
    try {
      const res = await fetch('/api/production/statuses')
      if (res.ok) {
        const data = await res.json()
        setStatuses(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadStaff() {
    const res = await fetch('/api/admin/collaborateurs')
    if (res.ok) {
      const data = await res.json()
      setStaff(Array.isArray(data) ? data : [])
    }
  }

  async function loadSettings() {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      if (data.production_default_due_days) setDueDays(data.production_default_due_days)
      if (data.production_auto_assign_id) setAutoAssignId(data.production_auto_assign_id)
    }
  }

  useEffect(() => {
    loadStatuses()
    loadStaff()
    loadSettings()
  }, [])

  async function handleAdd() {
    const name = prompt('Nom du statut :')
    if (!name?.trim()) return
    const res = await fetch('/api/production/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color: '#94a3b8', sort_order: statuses.length }),
    })
    if (res.ok) {
      const newStatus = await res.json()
      setStatuses(prev => [...prev, newStatus])
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce statut ?')) return
    const res = await fetch(`/api/production/statuses/${id}`, { method: 'DELETE' })
    if (res.ok) setStatuses(prev => prev.filter(s => s.id !== id))
  }

  async function patchStatus(id: string, patch: Partial<Status>) {
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    await fetch(`/api/production/statuses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function handleNameBlur(id: string, name: string) {
    if (!name.trim()) return
    await patchStatus(id, { name: name.trim() })
  }

  async function moveUp(id: string) {
    const idx = statuses.findIndex(s => s.id === id)
    if (idx <= 0) return
    const newStatuses = [...statuses]
    ;[newStatuses[idx - 1], newStatuses[idx]] = [newStatuses[idx], newStatuses[idx - 1]]
    const updates = newStatuses.map((s, i) => ({ ...s, sort_order: i }))
    setStatuses(updates)
    for (const s of updates) {
      await fetch(`/api/production/statuses/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: s.sort_order }),
      })
    }
  }

  async function moveDown(id: string) {
    const idx = statuses.findIndex(s => s.id === id)
    if (idx >= statuses.length - 1) return
    const newStatuses = [...statuses]
    ;[newStatuses[idx], newStatuses[idx + 1]] = [newStatuses[idx + 1], newStatuses[idx]]
    const updates = newStatuses.map((s, i) => ({ ...s, sort_order: i }))
    setStatuses(updates)
    for (const s of updates) {
      await fetch(`/api/production/statuses/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: s.sort_order }),
      })
    }
  }

  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOver(id)
  }

  async function handleDropOn(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOver(null); return }
    const fromIdx = statuses.findIndex(s => s.id === dragId)
    const toIdx = statuses.findIndex(s => s.id === targetId)
    if (fromIdx < 0 || toIdx < 0) { setDragId(null); setDragOver(null); return }
    const newStatuses = [...statuses]
    const [moved] = newStatuses.splice(fromIdx, 1)
    newStatuses.splice(toIdx, 0, moved)
    const updates = newStatuses.map((s, i) => ({ ...s, sort_order: i }))
    setStatuses(updates)
    setDragId(null)
    setDragOver(null)
    for (const s of updates) {
      await fetch(`/api/production/statuses/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: s.sort_order }),
      })
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_default_due_days: dueDays,
          production_auto_assign_id: autoAssignId,
        }),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2500)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section A: Statuses */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Statuts de production</h3>
            <p className="text-xs text-slate-500 mt-0.5">Glissez-déposez pour réordonner. Cliquez sur la couleur pour la modifier.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadStatuses} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Chargement…</div>
        ) : (
          <div className="space-y-2">
            {statuses.map((status, idx) => (
              <div
                key={status.id}
                draggable
                onDragStart={() => handleDragStart(status.id)}
                onDragOver={e => handleDragOver(e, status.id)}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDropOn(status.id)}
                className={cn(
                  'flex items-center gap-3 bg-slate-50 border rounded-xl px-3 py-2.5 transition-all',
                  dragOver === status.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                )}
              >
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />

                {/* Color picker */}
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    value={status.color}
                    onChange={e => patchStatus(status.id, { color: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Changer la couleur"
                  />
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: status.color }} />
                </div>

                {/* Name */}
                <input
                  type="text"
                  defaultValue={status.name}
                  key={status.name}
                  onBlur={e => handleNameBlur(status.id, e.target.value)}
                  className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                />

                {/* Toggles */}
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-500">
                    <input
                      type="checkbox"
                      checked={status.is_initial}
                      onChange={e => patchStatus(status.id, { is_initial: e.target.checked })}
                      className="accent-blue-600"
                    />
                    Initial
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-500">
                    <input
                      type="checkbox"
                      checked={status.is_final}
                      onChange={e => patchStatus(status.id, { is_final: e.target.checked })}
                      className="accent-green-600"
                    />
                    Final
                  </label>
                </div>

                {/* Order arrows */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveUp(status.id)} disabled={idx === 0} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30 transition-colors text-[10px] leading-none">▲</button>
                  <button onClick={() => moveDown(status.id)} disabled={idx === statuses.length - 1} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30 transition-colors text-[10px] leading-none">▼</button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(status.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {statuses.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aucun statut. Cliquez sur "Ajouter" pour créer le premier.</p>
            )}
          </div>
        )}
      </div>

      {/* Section B: Production settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-w-xl">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Paramètres de production</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Délai par défaut (jours après commande)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Nombre de jours ajoutés à la date de commande pour définir la date limite par défaut.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={dueDays}
                onChange={e => setDueDays(e.target.value)}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-500">jours</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Auto-assignation par défaut
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Assignez automatiquement les nouvelles lignes de production à un membre de l'équipe.
            </p>
            <select
              value={autoAssignId}
              onChange={e => setAutoAssignId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Aucune auto-assignation —</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.id}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {savingSettings
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : settingsSaved
                ? '✓ Enregistré'
                : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </div>
      </div>

      {/* Link to production page */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Accès rapide</h3>
        <p className="text-xs text-slate-500 mb-3">Gérez les lignes de production depuis l'interface dédiée.</p>
        <a
          href="/production"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          Ouvrir la production ↗
        </a>
      </div>
    </div>
  )
}
