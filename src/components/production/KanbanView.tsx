'use client'

import React, { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionLine, ProductionStatus, StaffMember } from './types'

interface Props {
  lines: ProductionLine[]
  statuses: ProductionStatus[]
  staff: StaffMember[]
  onUpdate: (id: string, patch: Partial<ProductionLine>) => void
  onSelect: (line: ProductionLine) => void
  userRole?: string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string, e?: React.MouseEvent) => void
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

interface CardProps {
  line: ProductionLine
  onClick: () => void
  onUpdate: (id: string, patch: Partial<ProductionLine>) => void
  canEditDate?: boolean
  selected?: boolean
  onToggleSelect?: (id: string, e?: React.MouseEvent) => void
}

function LineCard({ line, onClick, onUpdate, canEditDate, selected, onToggleSelect }: CardProps) {
  const overdue = isOverdue(line.due_date)
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', line.id)}
      onClick={onClick}
      className={cn(
        'relative bg-white border-2 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all select-none group overflow-hidden',
        selected ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-blue-300'
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleSelect?.(line.id, e) }}
        className={cn(
          'absolute top-2 right-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          selected
            ? 'bg-blue-600 border-blue-600 text-white opacity-100'
            : 'bg-white/90 border-slate-300 text-transparent opacity-0 group-hover:opacity-100 hover:border-blue-400'
        )}
      >
        {selected && (
          <svg viewBox="0 0 10 8" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4l3 3 5-6" />
          </svg>
        )}
      </button>
      {/* Aperçu visuel pleine largeur */}
      {line.file_thumb ? (
        <div className="w-full h-28 overflow-hidden border-b border-slate-100">
          <img
            src={line.file_thumb}
            alt="Aperçu"
            className="w-full h-full object-contain"
            style={{ background: 'repeating-conic-gradient(#f1f5f9 0% 25%, white 0% 50%) 0 0 / 12px 12px' }}
          />
        </div>
      ) : line.file_url ? (
        <div className="w-full h-28 overflow-hidden border-b border-slate-100 bg-slate-50 relative group">
          <object
            data={`${line.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
            type="application/pdf"
            className="w-full h-full pointer-events-none"
          >
            {/* fallback image si ce n'est pas un PDF */}
            <img src={line.file_url} alt="Aperçu" className="w-full h-full object-contain" />
          </object>
          <div className="absolute bottom-1 right-1 bg-black/40 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            PDF
          </div>
        </div>
      ) : (
        <div className="w-full h-16 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
          <FileText className="w-7 h-7 text-slate-200" />
        </div>
      )}

      <div className="p-3">
        <div className="mb-2">
          <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{line.product_name}</p>
          {(line.width_cm || line.height_cm) && (
            <p className="text-[10px] text-slate-400 mt-0.5">{line.width_cm}×{line.height_cm} cm</p>
          )}
        </div>

      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
          #{line.order_number}
        </span>
        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
          ×{line.quantity}
        </span>
      </div>

      <p className="text-[10px] text-slate-500 truncate mb-2">{line.client_name}</p>

      {/* Date enlèvement / livraison */}
      <div
        className="flex items-center gap-1 mb-2"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-[10px] text-slate-400 flex-shrink-0">📅</span>
        {canEditDate ? (
          <input
            type="date"
            value={line.due_date ?? ''}
            onChange={e => onUpdate(line.id, { due_date: e.target.value || null })}
            className={cn(
              'flex-1 text-[10px] font-semibold rounded px-1 py-0.5 border focus:outline-none focus:ring-1 focus:ring-amber-400 bg-transparent cursor-pointer',
              !line.due_date
                ? 'border-dashed border-slate-200 text-slate-300 hover:border-amber-300 hover:text-amber-500'
                : overdue
                  ? 'border-red-200 text-red-600 bg-red-50'
                  : 'border-green-200 text-green-700 bg-green-50'
            )}
            title="Date enlèvement / livraison"
          />
        ) : (
          <span className={cn(
            'text-[10px] font-semibold',
            !line.due_date ? 'text-slate-300 italic' : overdue ? 'text-red-600' : 'text-green-700'
          )}>
            {line.due_date
              ? new Date(line.due_date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Non définie'}
          </span>
        )}
      </div>

      {/* Finitions choisies */}
      {line.finitions_summary && line.finitions_summary.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {line.finitions_summary.map((f, i) => (
            <div key={i} className="flex items-start gap-1 text-[9px]">
              <span className="text-slate-400 flex-shrink-0 truncate max-w-[45%]">{f.label} :</span>
              <span className="font-semibold text-slate-600 truncate">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {line.assignee && (
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0" title={line.assignee.full_name}>
              {getInitials(line.assignee.full_name)}
            </div>
          )}
        </div>
        {line.file_url && (
          <a
            href={line.file_url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Télécharger le fichier"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      </div>{/* end .p-3 */}
    </div>
  )
}

/** Calcule les m² totaux d'un tableau de lignes */
function totalM2(lines: ProductionLine[]): number {
  return lines.reduce((sum, l) => {
    if (!l.width_cm || !l.height_cm) return sum
    return sum + (l.width_cm * l.height_cm * l.quantity) / 10000
  }, 0)
}

/** Trie par date d'échéance croissante (sans date → fin), puis par date de création */
function sortByDate(lines: ProductionLine[]): ProductionLine[] {
  return [...lines].sort((a, b) => {
    if (!a.due_date && !b.due_date) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const diff = a.due_date.localeCompare(b.due_date)
    if (diff !== 0) return diff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/** Groupe les lignes par nom de produit, trié selon la date min du groupe */
function groupByProduct(lines: ProductionLine[]): Array<{ product: string; lines: ProductionLine[] }> {
  const map = new Map<string, ProductionLine[]>()
  for (const line of lines) {
    const key = line.product_name || 'Autres'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(line)
  }
  return Array.from(map.entries())
    .map(([product, ls]) => ({ product, lines: sortByDate(ls) }))
    .sort((a, b) => {
      const dateA = a.lines.find(l => l.due_date)?.due_date
      const dateB = b.lines.find(l => l.due_date)?.due_date
      if (!dateA && !dateB) return a.product.localeCompare(b.product)
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA.localeCompare(dateB)
    })
}

export default function KanbanView({ lines, statuses, onUpdate, onSelect, userRole, selectedIds, onToggleSelect }: Props) {
  const canEditDate = userRole === 'admin'
  const [draggingOver, setDraggingOver] = useState<string | null>(null)

  function handleDrop(e: React.DragEvent, statusId: string) {
    e.preventDefault()
    const lineId = e.dataTransfer.getData('text/plain')
    if (lineId) onUpdate(lineId, { status_id: statusId })
    setDraggingOver(null)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {statuses.map(status => {
          const columnLines = lines.filter(l => l.status_id === status.id)
          const m2 = totalM2(columnLines)
          const groups = groupByProduct(columnLines)
          const isOver = draggingOver === status.id
          return (
            <div
              key={status.id}
              className={cn(
                'w-56 flex-shrink-0 flex flex-col rounded-xl border-2 transition-all',
                isOver ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-slate-200/60'
              )}
              onDragOver={e => { e.preventDefault(); setDraggingOver(status.id) }}
              onDragEnter={e => { e.preventDefault(); setDraggingOver(status.id) }}
              onDragLeave={() => setDraggingOver(null)}
              onDrop={e => handleDrop(e, status.id)}
            >
              {/* Column header */}
              <div className="px-3 pt-2.5 pb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    <span className="text-xs font-bold text-slate-700">{status.name}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded-full shadow-sm">
                    {columnLines.length}
                  </span>
                </div>
                {/* Total m² */}
                {m2 > 0 && (
                  <div className="flex items-center gap-1 bg-white/70 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400 font-medium">Total</span>
                    <span className="text-[11px] font-black text-slate-700 ml-auto">
                      {m2 < 1 ? m2.toFixed(2) : m2.toFixed(1)} m²
                    </span>
                  </div>
                )}
              </div>

              {/* Cards grouped by product */}
              <div className="flex flex-col gap-0 px-2 pb-3 min-h-[120px] flex-1">
                {groups.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-medium py-4">
                    Déposez ici
                  </div>
                )}
                {groups.map(({ product, lines: groupLines }) => (
                  <div key={product} className="mb-3">
                    {/* Product group label */}
                    <div className="flex items-center gap-1.5 px-1 py-1 mb-1.5">
                      <div className="flex-1 h-px bg-slate-300/60" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                        {product}
                      </span>
                      <div className="flex-1 h-px bg-slate-300/60" />
                    </div>
                    {/* Cards */}
                    <div className="flex flex-col gap-2">
                      {groupLines.map(line => (
                        <LineCard
                          key={line.id}
                          line={line}
                          onClick={() => onSelect(line)}
                          onUpdate={onUpdate}
                          canEditDate={canEditDate}
                          selected={selectedIds?.has(line.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
