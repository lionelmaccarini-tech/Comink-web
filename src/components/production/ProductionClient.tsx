'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { LayoutGrid, List, Calendar, Search, RefreshCw, ChevronDown, Truck, Download, X, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionLine, ProductionStatus, StaffMember } from './types'
import KanbanView from './KanbanView'
import ListView from './ListView'
import CalendarView from './CalendarView'
import LineDrawer from './LineDrawer'
import DeliveriesView from './DeliveriesView'

interface Props {
  lines: ProductionLine[]
  statuses: ProductionStatus[]
  staff: StaffMember[]
  userRole: string
}

type ViewType = 'kanban' | 'list' | 'calendar' | 'deliveries'

function normalizeStatusName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim()
}

function buildFilename(line: ProductionLine): string {
  const parts: string[] = [line.order_number]
  if (line.production_code) parts.push(line.production_code)
  parts.push(`${line.quantity}ex`)
  if (line.width_cm && line.height_cm) parts.push(`${line.width_cm}x${line.height_cm}cm`)
  const base = parts.join('-').replace(/[^a-zA-Z0-9\-_.]/g, '-')
  const ext = line.file_name?.match(/\.[a-z0-9]+$/i)?.[0] ?? '.pdf'
  return base + ext
}

async function downloadLineVisual(line: ProductionLine): Promise<void> {
  if (!line.file_url) return
  const filename = buildFilename(line)
  // Passe par le proxy /api/download pour forcer Content-Disposition: attachment
  // et éviter que le navigateur n'ouvre le PDF au lieu de le télécharger
  const proxyUrl = `/api/download?url=${encodeURIComponent(line.file_url)}&filename=${encodeURIComponent(filename)}`
  const a = document.createElement('a')
  a.href = proxyUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function downloadMultipleVisuals(targetLines: ProductionLine[]): Promise<void> {
  const withFiles = targetLines.filter(l => l.file_url)
  for (let i = 0; i < withFiles.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 600))
    await downloadLineVisual(withFiles[i])
  }
}

export default function ProductionClient({ lines: initialLines, statuses, staff, userRole }: Props) {
  const enrichLines = (raw: ProductionLine[]) =>
    raw.map(l => ({
      ...l,
      assignee: l.assignee_id ? (staff.find(s => s.id === l.assignee_id) ?? null) : null,
    }))

  const [lines, setLines] = useState<ProductionLine[]>(() => enrichLines(initialLines))
  const [view, setView] = useState<ViewType>('calendar')
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterProduct, setFilterProduct] = useState<string | null>(null)
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const updateLine = useCallback(async (id: string, patch: Partial<ProductionLine>) => {
    const currentLine = lines.find(l => l.id === id)
    if (patch.status_id && currentLine) {
      const newStatus = statuses.find(s => s.id === patch.status_id)
      const oldStatus = statuses.find(s => s.id === currentLine.status_id)
      const isPrepresse = newStatus && normalizeStatusName(newStatus.name).includes('prepresse')
      const wasDebuter  = oldStatus && normalizeStatusName(oldStatus.name).includes('debuter')
      if (isPrepresse && wasDebuter && currentLine.file_url) {
        downloadLineVisual(currentLine)
      }
    }
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    if (selectedLine?.id === id) setSelectedLine(prev => prev ? { ...prev, ...patch } : null)
    try {
      const res = await fetch(`/api/production/lines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const updated = await res.json()
        setLines(prev => prev.map(l => l.id === id ? updated : l))
        if (selectedLine?.id === id) setSelectedLine(updated)
      }
    } catch (err) {
      console.error('updateLine error', err)
    }
  }, [selectedLine, lines, statuses])

  const bulkUpdateStatus = useCallback(async (statusId: string) => {
    const ids = Array.from(selectedIds)
    const targetLines = lines.filter(l => ids.includes(l.id))
    const newStatus = statuses.find(s => s.id === statusId)
    const isPrepresse = newStatus && normalizeStatusName(newStatus.name).includes('prepresse')
    const linesToDownload = isPrepresse
      ? targetLines.filter(l => {
          const oldStatus = statuses.find(s => s.id === l.status_id)
          return oldStatus && normalizeStatusName(oldStatus.name).includes('debuter')
        })
      : []
    setLines(prev => prev.map(l => ids.includes(l.id) ? { ...l, status_id: statusId } : l))
    await Promise.all(ids.map(id =>
      fetch(`/api/production/lines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: statusId }),
      })
    ))
    if (linesToDownload.length > 0) downloadMultipleVisuals(linesToDownload)
    clearSelection()
  }, [selectedIds, lines, statuses, clearSelection])

  const downloadSelected = useCallback(() => {
    const ids = Array.from(selectedIds)
    downloadMultipleVisuals(lines.filter(l => ids.includes(l.id) && !!l.file_url))
  }, [selectedIds, lines])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/production/lines')
      if (res.ok) setLines(await res.json())
    } finally { setRefreshing(false) }
  }

  const calendarAnchor = useMemo(() => {
    const finalIds = new Set(statuses.filter(s => s.is_final).map(s => s.id))
    const nonFinal = lines.filter(l => !finalIds.has(l.status_id))
    if (nonFinal.length === 0) return new Date()
    const sorted = [...nonFinal].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const ref = sorted[0]
    return ref.due_date ? new Date(ref.due_date + 'T00:00:00') : new Date(ref.created_at)
  }, [lines, statuses])

  const productNames = useMemo(() =>
    [...new Set(lines.map(l => l.product_name).filter(Boolean))].sort()
  , [lines])

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      if (filterStatus   && l.status_id    !== filterStatus)   return false
      if (filterAssignee && l.assignee_id  !== filterAssignee) return false
      if (filterProduct  && l.product_name !== filterProduct)  return false
      if (filterDateFrom && (!l.due_date || l.due_date < filterDateFrom)) return false
      if (filterDateTo   && (!l.due_date || l.due_date > filterDateTo))   return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!l.product_name.toLowerCase().includes(q) && !l.order_number.toLowerCase().includes(q) &&
            !l.client_name.toLowerCase().includes(q)  && !l.client_email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [lines, filterStatus, filterAssignee, filterProduct, filterDateFrom, filterDateTo, searchQuery])

  const activeFilterCount = [filterStatus, filterAssignee, filterProduct, filterDateFrom, filterDateTo].filter(Boolean).length
  const selectedCount = selectedIds.size
  const selectedHaveFiles = lines.some(l => selectedIds.has(l.id) && l.file_url)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-sky-950 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png" alt="Comink" className="h-8 w-auto" />
          <div className="w-px h-6 bg-sky-800" />
          <span className="text-sm font-bold text-sky-200">Production</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-xs text-sky-300 hover:text-white transition-colors">Administration</a>
          <a href="/" className="text-xs text-sky-300 hover:text-white transition-colors">← Retour au site</a>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">Production</h1>
            {view !== 'deliveries' && (
              <p className="text-xs text-slate-500 mt-0.5">{filteredLines.length} ligne{filteredLines.length !== 1 ? 's' : ''} de production</p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {([
              { id: 'kanban' as ViewType, icon: LayoutGrid, label: 'Kanban' },
              { id: 'list'   as ViewType, icon: List,        label: 'Liste' },
              { id: 'calendar' as ViewType, icon: Calendar,  label: 'Calendrier' },
              { id: 'deliveries' as ViewType, icon: Truck,   label: 'Livraisons' },
            ]).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                  view === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50')}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {view !== 'deliveries' && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rechercher commande, client…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="relative">
                <select value={filterStatus ?? ''} onChange={e => setFilterStatus(e.target.value || null)}
                  className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Tous les statuts</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filterAssignee ?? ''} onChange={e => setFilterAssignee(e.target.value || null)}
                  className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Tous les assignés</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name || s.id}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterStatus(null); setFilterAssignee(null); setFilterProduct(null); setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery('') }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap">
                  ✕ Effacer ({activeFilterCount})
                </button>
              )}
              <button onClick={handleRefresh} className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-auto" title="Rafraîchir">
                <RefreshCw className={cn('w-4 h-4 text-slate-400', refreshing && 'animate-spin')} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <div className="relative">
                <select value={filterProduct ?? ''} onChange={e => setFilterProduct(e.target.value || null)}
                  className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Tous les produits</option>
                  {productNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Échéance</span>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" />
                <span className="text-xs text-slate-400">→</span>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" />
              </div>
              {(() => {
                const today = new Date()
                const fmt = (d: Date) => d.toISOString().slice(0, 10)
                const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - (today.getDay() + 6) % 7)
                const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6)
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                return (
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Auj.', from: fmt(today), to: fmt(today) },
                      { label: 'Cette sem.', from: fmt(startOfWeek), to: fmt(endOfWeek) },
                      { label: 'Ce mois', from: fmt(startOfMonth), to: fmt(endOfMonth) },
                    ].map(({ label, from, to }) => (
                      <button key={label} onClick={() => { setFilterDateFrom(from); setFilterDateTo(to) }}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-slate-600">
                        {label}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {view === 'kanban' && (
          <KanbanView lines={filteredLines} statuses={statuses} staff={staff}
            onUpdate={updateLine} onSelect={setSelectedLine} userRole={userRole}
            selectedIds={selectedIds} onToggleSelect={toggleSelect} />
        )}
        {view === 'list' && (
          <ListView lines={filteredLines} statuses={statuses} staff={staff}
            onUpdate={updateLine} onSelect={setSelectedLine} userRole={userRole}
            selectedIds={selectedIds} onToggleSelect={toggleSelect} />
        )}
        {view === 'calendar' && (
          <CalendarView lines={filteredLines} statuses={statuses}
            onSelect={setSelectedLine} initialDate={calendarAnchor} />
        )}
        {view === 'deliveries' && <DeliveriesView userRole={userRole} />}
      </div>

      {/* Floating bulk action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 max-w-[90vw] flex-wrap justify-center">
          <span className="text-sm font-bold text-slate-200 whitespace-nowrap">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="w-px h-5 bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {statuses.map(s => (
              <button key={s.id} onClick={() => bulkUpdateStatus(s.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                style={{ backgroundColor: s.color + '33', color: s.color, border: `1.5px solid ${s.color}55` }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-700 shrink-0" />
          {selectedHaveFiles && (
            <button onClick={downloadSelected}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors whitespace-nowrap">
              <Download className="w-3.5 h-3.5" /> Télécharger
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set(filteredLines.map(l => l.id)))}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors whitespace-nowrap">
            <CheckSquare className="w-3.5 h-3.5" /> Tout
          </button>
          <button onClick={clearSelection}
            className="p-1.5 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedLine && (
        <LineDrawer line={selectedLine} statuses={statuses} staff={staff}
          onUpdate={updateLine} onClose={() => setSelectedLine(null)} userRole={userRole} />
      )}
    </div>
  )
}
