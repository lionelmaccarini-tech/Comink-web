'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Download, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionLine, ProductionStatus } from './types'

interface Props {
  lines: ProductionLine[]
  statuses: ProductionStatus[]
  onSelect: (line: ProductionLine) => void
  initialDate?: Date
}

const DAY_SHORT  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_FULL   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MONTH_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// Lundi de la semaine contenant `date`
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0=Mon … 6=Sun
  d.setDate(d.getDate() - dow)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first    = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7
  const total    = new Date(year, month + 1, 0).getDate()
  const arr: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) arr.push(null)
  for (let d = 1; d <= total; d++) arr.push(new Date(year, month, d))
  return arr
}

function AnalysisScoreBadge({ analysis }: { analysis: NonNullable<ProductionLine['file_analysis']> }) {
  const color = analysis.status === 'ok' ? '#10b981' : analysis.status === 'warning' ? '#f59e0b' : '#ef4444'
  const bg    = analysis.status === 'ok' ? '#d1fae5' : analysis.status === 'warning' ? '#fef3c7' : '#fee2e2'
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>
      {analysis.status === 'ok' ? '✓' : '⚠'} {analysis.score}%
    </span>
  )
}

export default function CalendarView({ lines, statuses, onSelect, initialDate }: Props) {
  const [mode, setMode] = useState<'week' | 'month'>('week')

  // ── Week state ──────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(initialDate ?? new Date())
  )

  // ── Month state ─────────────────────────────────────────────────────────────
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const ref = initialDate ?? new Date()
    return new Date(ref.getFullYear(), ref.getMonth(), 1)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function getStatus(line: ProductionLine): ProductionStatus | undefined {
    return statuses.find(s => s.id === line.status_id) ?? line.status
  }

  function linesByDate(key: string): ProductionLine[] {
    return lines.filter(l => l.due_date === key)
  }

  const noDate = lines.filter(l => !l.due_date)

  // ── Navigation ───────────────────────────────────────────────────────────────
  function prevWeek()  { setWeekStart(d => addDays(d, -7)) }
  function nextWeek()  { setWeekStart(d => addDays(d, +7)) }
  function goToday()   { setWeekStart(getWeekStart(new Date())); setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }
  function prevMonth() { setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = weekDays[6]

  // ── Week range label ─────────────────────────────────────────────────────────
  function weekLabel(): string {
    const s = weekStart
    const e = weekEnd
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${MONTH_LABELS[s.getMonth()]} ${s.getFullYear()}`
    }
    return `${s.getDate()} ${MONTH_LABELS[s.getMonth()]} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()]} ${e.getFullYear()}`
  }

  // ── Week line card ────────────────────────────────────────────────────────────
  function WeekLineCard({ line }: { line: ProductionLine }) {
    const status = getStatus(line)
    const color  = status?.color ?? '#94a3b8'
    return (
      <button
        onClick={() => onSelect(line)}
        className="w-full text-left bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
      >
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
        <div className="p-2 space-y-1">
          {/* Thumbnail + name */}
          <div className="flex items-start gap-1.5">
            {line.file_thumb ? (
              <img src={line.file_thumb} alt="" className="w-8 h-8 rounded object-contain flex-shrink-0 border border-slate-100 bg-white"
                style={{ background: 'repeating-conic-gradient(#f1f5f9 0% 25%, white 0% 50%) 0 0 / 8px 8px' }} />
            ) : line.file_url ? (
              <div className="w-8 h-8 rounded flex-shrink-0 border border-slate-100 bg-slate-50 overflow-hidden relative">
                <object data={`${line.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} type="application/pdf"
                  className="w-full h-full pointer-events-none scale-[2] origin-top-left">
                  <span className="text-[7px] font-bold text-slate-400 flex items-center justify-center h-full">PDF</span>
                </object>
              </div>
            ) : (
              <div className="w-8 h-8 rounded flex-shrink-0 border border-slate-100 bg-slate-50 flex items-center justify-center">
                <span className="text-[8px] font-bold text-slate-300">–</span>
              </div>
            )}
            <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 flex-1">{line.product_name}</p>
          </div>
          {/* Dimensions */}
          {line.width_cm && line.height_cm && (
            <p className="text-[10px] text-slate-400">{line.width_cm}×{line.height_cm} cm · ×{line.quantity}</p>
          )}
          {/* Order + client */}
          <p className="text-[10px] text-slate-500 truncate">#{line.order_number}</p>
          <p className="text-[10px] text-slate-500 truncate">{line.client_name}</p>
          {/* Références client */}
          {(line.order_reference || line.line_reference) && (
            <p className="text-[9px] font-bold text-blue-600 truncate">
              🏷 {line.line_reference || line.order_reference}
            </p>
          )}
          {/* Score analyse fichier */}
          {line.file_analysis && (
            <div className="pt-0.5">
              <AnalysisScoreBadge analysis={line.file_analysis} />
            </div>
          )}
          {/* Status pill */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-[80%]"
              style={{ backgroundColor: color + '22', color }}
            >
              {status?.name ?? '—'}
            </span>
            {line.file_url && (
              <a
                href={line.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-slate-300 hover:text-blue-500 transition-colors flex-shrink-0"
                title="Télécharger"
              >
                <Download className="w-3 h-3" />
              </a>
            )}
          </div>
          {line.assignee && (
            <p className="text-[9px] text-slate-400 flex items-center gap-1 truncate">
              <User className="w-2.5 h-2.5" />{line.assignee.full_name}
            </p>
          )}
        </div>
      </button>
    )
  }

  // ── Month mini chip ───────────────────────────────────────────────────────────
  function MonthChip({ line }: { line: ProductionLine }) {
    const status = getStatus(line)
    const color  = status?.color ?? '#94a3b8'
    return (
      <button
        onClick={() => onSelect(line)}
        className="w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80"
        style={{ backgroundColor: color + '33', color }}
        title={`${line.product_name} · ${line.client_name}`}
      >
        {line.product_name}
      </button>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-3 flex-wrap">

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={mode === 'week' ? prevWeek : prevMonth}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[200px] text-center">
            {mode === 'week'
              ? weekLabel()
              : `${MONTH_LABELS[monthDate.getMonth()]} ${monthDate.getFullYear()}`
            }
          </span>
          <button
            onClick={mode === 'week' ? nextWeek : nextMonth}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode('week')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Semaine
          </button>
          <button
            onClick={() => setMode('month')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Mois
          </button>
        </div>
      </div>

      {/* ══════════════ WEEK VIEW ══════════════════════════════════════════════ */}
      {mode === 'week' && (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day, i) => {
              const isToday = day.getTime() === today.getTime()
              const count   = linesByDate(isoDate(day)).length
              return (
                <div key={i} className={cn(
                  'px-2 py-3 text-center border-r border-slate-100 last:border-r-0',
                  isToday && 'bg-blue-50'
                )}>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{DAY_SHORT[i]}</p>
                  <div className={cn(
                    'text-lg font-black leading-none mt-0.5 mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                  )}>
                    {day.getDate()}
                  </div>
                  {count > 0 && (
                    <span className="mt-1 inline-block text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day, i) => {
              const isToday  = day.getTime() === today.getTime()
              const dayLines = linesByDate(isoDate(day))
              return (
                <div
                  key={i}
                  className={cn(
                    'border-r border-slate-100 last:border-r-0 p-2 space-y-1.5',
                    isToday && 'bg-blue-50/30'
                  )}
                >
                  {dayLines.length === 0 ? (
                    <div className="h-12 flex items-center justify-center">
                      <span className="text-[10px] text-slate-200">—</span>
                    </div>
                  ) : (
                    dayLines.map(line => (
                      <WeekLineCard key={line.id} line={line} />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ══════════════ MONTH VIEW ═════════════════════════════════════════════ */}
      {mode === 'month' && (() => {
        const year  = monthDate.getFullYear()
        const month = monthDate.getMonth()
        const days  = getMonthDays(year, month)
        return (
          <>
            <div className="grid grid-cols-7 border-b border-slate-200">
              {DAY_SHORT.map(d => (
                <div key={d} className="px-2 py-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) return (
                  <div key={`e-${i}`} className="min-h-[90px] border-b border-r border-slate-100 bg-slate-50/50" />
                )
                const dayLines = linesByDate(isoDate(day))
                const isToday  = day.getTime() === today.getTime()
                const visible  = dayLines.slice(0, 3)
                const overflow = dayLines.length - 3
                return (
                  <div
                    key={isoDate(day)}
                    className={cn(
                      'min-h-[90px] p-1.5 border-b border-r border-slate-100 transition-colors',
                      isToday && 'bg-blue-50/50'
                    )}
                  >
                    <div className={cn(
                      'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-500'
                    )}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {visible.map(line => <MonthChip key={line.id} line={line} />)}
                      {overflow > 0 && (
                        <p className="text-[10px] text-slate-400 font-semibold pl-1">
                          +{overflow} autre{overflow > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      })()}

      {/* ── Sans échéance ──────────────────────────────────────────────────── */}
      {noDate.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Sans échéance ({noDate.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {noDate.map(line => {
              const status = getStatus(line)
              const color  = status?.color ?? '#94a3b8'
              return (
                <button
                  key={line.id}
                  onClick={() => onSelect(line)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 flex items-center gap-1.5"
                  style={{ backgroundColor: color + '22', color }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {line.product_name}
                  <span className="opacity-60">· #{line.order_number}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
