'use client'

import React, { useState } from 'react'
import { FileText, Download, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionLine, ProductionStatus, StaffMember } from './types'

// ── Score badge ───────────────────────────────────────────────────────────────
function AnalysisScoreBadge({ analysis }: { analysis: NonNullable<ProductionLine['file_analysis']> }) {
  const { score, status } = analysis
  const cls = status === 'error'
    ? 'bg-red-100 text-red-700 border-red-200'
    : status === 'warning'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
  const icon = status === 'error' ? '✗' : status === 'warning' ? '⚠' : '✓'
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border', cls)}>
      {icon} {score}%
    </span>
  )
}

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

type SortKey = 'product_name' | 'order_number' | 'client_name' | 'quantity' | 'status_id' | 'assignee_id' | 'due_date' | 'created_at'

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function ListView({ lines, statuses, staff, onUpdate, onSelect, userRole, selectedIds, onToggleSelect }: Props) {
  const canEditDate = userRole === 'admin'
  const [sortKey, setSortKey] = useState<SortKey>('due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...lines].sort((a, b) => {
    // Pour due_date : les lignes sans date toujours en fin de liste
    if (sortKey === 'due_date') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
    }
    const av = (a as any)[sortKey] ?? ''
    const bv = (b as any)[sortKey] ?? ''
    const cmp = String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />
  }

  function Th({ label, k, center }: { label: string; k?: SortKey; center?: boolean }) {
    return (
      <th
        className={cn('px-4 py-3 text-left', k && 'cursor-pointer select-none hover:bg-slate-100', center && 'text-center')}
        onClick={k ? () => handleSort(k) : undefined}
      >
        <div className={cn('flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider', center && 'justify-center')}>
          {label}
          {k && <SortIcon k={k} />}
        </div>
      </th>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Aucune ligne de production</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  className="accent-blue-600 cursor-pointer w-4 h-4"
                  checked={sorted.length > 0 && sorted.every(l => selectedIds?.has(l.id))}
                  onChange={e => sorted.forEach(l => {
                    const isSelected = selectedIds?.has(l.id) ?? false
                    if (e.target.checked !== isSelected) onToggleSelect?.(l.id)
                  })}
                />
              </th>
              <th className="px-4 py-3 w-12" />
              <Th label="Produit" k="product_name" />
              <Th label="Commande" k="order_number" />
              <Th label="Client" k="client_name" />
              <Th label="Qté" k="quantity" center />
              <Th label="Statut" k="status_id" />
              <Th label="Assigné" k="assignee_id" />
              <Th label="Analyse" />
              <Th label="Échéance" k="due_date" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((line, idx) => {
              const status = line.status
              const overdue = isOverdue(line.due_date)
              return (
                <tr key={line.id} onClick={() => onSelect(line)}
                  className={cn(
                    'hover:bg-blue-50/30 transition-colors cursor-pointer',
                    selectedIds?.has(line.id) ? 'bg-blue-50' : (idx % 2 === 1 && 'bg-slate-50/50')
                  )}>
                  {/* Checkbox */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(line.id) ?? false}
                      onChange={() => onToggleSelect?.(line.id)}
                      className="accent-blue-600 cursor-pointer w-4 h-4"
                    />
                  </td>
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    {line.file_thumb ? (
                      <img src={line.file_thumb} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 truncate max-w-[180px]">{line.product_name}</p>
                    {(line.width_cm || line.height_cm) && (
                      <p className="text-[10px] text-slate-400">{line.width_cm}×{line.height_cm} cm</p>
                    )}
                  </td>

                  {/* Order */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      #{line.order_number}
                    </span>
                    {line.order_reference && (
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5 truncate max-w-[120px]" title={line.order_reference}>
                        🏷 {line.order_reference}
                      </p>
                    )}
                    {line.line_reference && line.line_reference !== line.order_reference && (
                      <p className="text-[10px] font-bold text-purple-600 mt-0.5 truncate max-w-[120px]" title={line.line_reference}>
                        🏷 {line.line_reference}
                      </p>
                    )}
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700 truncate max-w-[140px]">{line.client_name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{line.client_email}</p>
                  </td>

                  {/* Qty */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">×{line.quantity}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {status ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: status.color + '22', color: status.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3">
                    <select
                      value={line.assignee_id ?? ''}
                      onChange={e => onUpdate(line.id, { assignee_id: e.target.value || null })}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white max-w-[120px]"
                    >
                      <option value="">—</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name || s.id}</option>
                      ))}
                    </select>
                  </td>

                  {/* Analyse score */}
                  <td className="px-4 py-3">
                    {line.file_analysis ? (
                      <AnalysisScoreBadge analysis={line.file_analysis} />
                    ) : line.file_url ? (
                      <span className="text-xs text-slate-300 italic">—</span>
                    ) : (
                      <span className="text-xs text-slate-200">—</span>
                    )}
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {canEditDate ? (
                      <input type="date" value={line.due_date ?? ''}
                        onChange={e => onUpdate(line.id, { due_date: e.target.value || null })}
                        className={cn('text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                          overdue ? 'border-red-300 text-red-600' : 'border-slate-200 text-slate-700')} />
                    ) : (
                      <span className={cn('text-xs font-semibold', !line.due_date ? 'text-slate-300 italic' : overdue ? 'text-red-600' : 'text-green-700')}>
                        {line.due_date ? new Date(line.due_date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {line.file_url && (
                        <a
                          href={line.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => onSelect(line)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        title="Ouvrir"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
