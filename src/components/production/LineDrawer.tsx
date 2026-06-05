'use client'

import React, { useState, useEffect } from 'react'
import { X, Download, FileText, ZoomIn, RefreshCw, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductionLine, ProductionStatus, StaffMember } from './types'
import FileAnalysisResult from '@/components/crm/FileAnalysisResult'
import { generateAnalysisReport } from '@/lib/generateAnalysisReport'

interface Props {
  line: ProductionLine
  statuses: ProductionStatus[]
  staff: StaffMember[]
  onUpdate: (id: string, patch: Partial<ProductionLine>) => void
  onClose: () => void
  userRole?: string
}

export default function LineDrawer({ line, statuses, staff, onUpdate, onClose, userRole }: Props) {
  const canEditDate = userRole === 'admin'
  const [notes, setNotes] = useState(line.notes ?? '')
  const [lightbox, setLightbox] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  // Sync if line changes
  useEffect(() => {
    setNotes(line.notes ?? '')
    setAnalysisError('')
  }, [line.id, line.notes])

  // Auto-analyser au premier ouverture si fichier présent et pas encore analysé
  useEffect(() => {
    if (line.file_url && !line.file_analysis && !analysing) {
      handleReanalyze()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id])

  async function handleReanalyze() {
    setAnalysing(true)
    setAnalysisError('')
    try {
      const res = await fetch(`/api/production/lines/${line.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Analyse échouée')
      // Trigger parent refresh via onUpdate with the new analysis
      onUpdate(line.id, { file_analysis: data.analysis })
    } catch (err: any) {
      setAnalysisError(err.message || 'Erreur lors de l\'analyse')
    } finally {
      setAnalysing(false)
    }
  }

  function handleNotesBlur() {
    if (notes !== (line.notes ?? '')) {
      onUpdate(line.id, { notes })
    }
  }

  const status = statuses.find(s => s.id === line.status_id) ?? line.status

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ligne de production</p>
            <p className="text-sm font-black text-slate-900 mt-0.5 truncate">{line.product_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Aperçu visuel ── */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {line.file_thumb ? (
              <div className="relative group cursor-zoom-in" onClick={() => setLightbox(true)}>
                <img
                  src={line.file_thumb}
                  alt="Aperçu"
                  className="w-full max-h-56 object-contain"
                  style={{ background: 'repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </div>
            ) : line.file_url ? (
              <div className="relative group" style={{ height: '280px' }}>
                <iframe
                  src={`${line.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit&zoom=page-fit`}
                  className="w-full h-full border-0 pointer-events-none"
                  title="Aperçu PDF"
                />
                {/* Overlay cliquable pour ouvrir en plein écran */}
                <div
                  className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors cursor-zoom-in flex items-end justify-center pb-3"
                  onClick={() => window.open(line.file_url!, '_blank')}
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5" /> Ouvrir le fichier
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-300">
                <FileText className="w-10 h-10" />
                <p className="text-xs">Aucun fichier</p>
              </div>
            )}
            {/* Barre actions fichier */}
            {line.file_url && (
              <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between bg-white">
                <p className="text-xs text-slate-500 truncate mr-2">{line.file_name || 'Fichier'}</p>
                <a
                  href={line.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 flex-shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
              </div>
            )}
          </div>

          {/* ── Badge conformité dimensions ── */}
          {line.file_url && line.file_analysis && (line.width_cm || line.height_cm) && (() => {
            const dimCheck = (line.file_analysis as any)?.checks?.find((c: any) => c.id === 'dimensions')
            const colorCheck = (line.file_analysis as any)?.checks?.find((c: any) => c.id === 'color_mode')
            if (!dimCheck && !colorCheck) return null
            return (
              <div className="flex flex-wrap gap-2">
                {dimCheck && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                    dimCheck.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : dimCheck.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {dimCheck.status === 'ok' ? '✓' : dimCheck.status === 'warning' ? '⚠' : '✗'}
                    {' '}Format {line.width_cm} × {line.height_cm} cm
                    {dimCheck.status !== 'ok' && <span className="font-normal ml-1">— {dimCheck.message}</span>}
                  </div>
                )}
                {colorCheck && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                    colorCheck.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {colorCheck.status === 'ok' ? '✓ CMYK' : '✗ RGB — doit être converti'}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Analyse du fichier ── */}
          {line.file_url && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analyse du fichier</p>
                <div className="flex items-center gap-2">
                  {line.file_analysis && !analysing && (
                    <button
                      onClick={() => generateAnalysisReport({
                        fileName: line.file_name || 'fichier',
                        orderNumber: line.order_number,
                        clientName: line.client_name,
                        dimensions: line.width_cm && line.height_cm ? `${line.width_cm} × ${line.height_cm} cm` : undefined,
                      }, line.file_analysis!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Rapport
                    </button>
                  )}
                  <button
                    onClick={handleReanalyze}
                    disabled={analysing}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', analysing && 'animate-spin')} />
                    {analysing ? 'Analyse…' : line.file_analysis ? 'Re-analyser' : 'Analyser'}
                  </button>
                </div>
              </div>
              <FileAnalysisResult
                result={line.file_analysis ?? null}
                loading={analysing}
                error={analysisError || undefined}
              />
              {!line.file_analysis && !analysing && !analysisError && (
                <p className="text-xs text-slate-400 italic">Aucune analyse — cliquez sur "Analyser" pour lancer la vérification.</p>
              )}
            </div>
          )}

          {/* Product info */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Produit</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nom</span>
                <span className="font-semibold text-slate-800">{line.product_name}</span>
              </div>
              {(line.width_cm || line.height_cm) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Dimensions</span>
                  <span className="font-semibold text-slate-800">{line.width_cm} × {line.height_cm} cm</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Quantité</span>
                <span className="font-bold text-blue-700">×{line.quantity}</span>
              </div>
            </div>
          </div>

          {/* Order info */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Commande</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Numéro</span>
                <span className="font-bold text-slate-800">#{line.order_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Client</span>
                <span className="font-semibold text-slate-800">{line.client_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-600 text-xs">{line.client_email}</span>
              </div>
            </div>
          </div>

          {/* Finitions choisies */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Options de production</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {line.delai_label && (
                <div className="flex items-center justify-between px-3 py-2 bg-amber-50">
                  <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">⏱ Délai</span>
                  <span className="text-xs font-bold text-amber-800">{line.delai_label}</span>
                </div>
              )}
              {line.finitions_summary && line.finitions_summary.length > 0 ? (
                line.finitions_summary.map((f, i) => (
                  <div key={i} className="flex items-start justify-between px-3 py-2">
                    <span className="text-xs text-slate-500 flex-shrink-0 mr-3">{f.label}</span>
                    <span className="text-xs font-semibold text-slate-800 text-right">{f.value}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2.5 text-xs text-slate-400 italic">
                  {line.delai_label ? null : 'Aucune option enregistrée'}
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Statut</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => onUpdate(line.id, { status_id: s.id })}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all',
                    line.status_id === s.id
                      ? 'border-current shadow-sm'
                      : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                  style={line.status_id === s.id ? {
                    backgroundColor: s.color + '22',
                    color: s.color,
                    borderColor: s.color,
                  } : undefined}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: line.status_id === s.id ? s.color : '#94a3b8' }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assigné à</label>
            <select
              value={line.assignee_id ?? ''}
              onChange={e => onUpdate(line.id, { assignee_id: e.target.value || null })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Non assigné —</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.id}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <label className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
              <span>📅</span> Date enlèvement / livraison
            </label>
            {canEditDate ? (
              <input
                type="date"
                value={line.due_date ?? ''}
                onChange={e => onUpdate(line.id, { due_date: e.target.value || null })}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-semibold text-slate-800"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800 px-1">
                {line.due_date
                  ? new Date(line.due_date).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : <span className="text-slate-400 font-normal italic">Non définie</span>
                }
              </p>
            )}
            {line.delai_label && (
              <p className="text-[11px] text-amber-700 font-semibold mt-1.5 flex items-center gap-1">
                <span>⏱</span> {line.delai_label}
              </p>
            )}
            {canEditDate && (
              <p className="text-[11px] text-amber-600 mt-1">
                Calculée depuis le délai choisi par le client · modifiable si besoin.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={4}
              placeholder="Ajouter des notes de production…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Créé le</span>
              <span>{new Date(line.created_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Dernière mise à jour</span>
              <span>{new Date(line.updated_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && line.file_thumb && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={line.file_thumb}
            alt="Aperçu plein écran"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {line.file_url && (
            <a
              href={line.file_url}
              download
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-5 py-2.5 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Download className="w-4 h-4" /> Télécharger le fichier original
            </a>
          )}
        </div>
      )}
    </>
  )
}
