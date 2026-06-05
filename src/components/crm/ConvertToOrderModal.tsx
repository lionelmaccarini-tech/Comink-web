'use client'

import React, { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, Loader2, Package, Trash2 } from 'lucide-react'
import FileAnalysisResult, { type AnalysisResult } from './FileAnalysisResult'

const fmt = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

interface FileInfo { url: string; name: string; thumb?: string }
interface Props {
  quote: any
  currentUserId?: string
  onClose: () => void
  onConverted: (orderNumber: string) => void
}

export default function ConvertToOrderModal({ quote, currentUserId, onClose, onConverted }: Props) {
  const items: any[] = Array.isArray(quote.items) ? quote.items : []
  const [fileUrls,  setFileUrls]  = useState<Record<number, FileInfo>>({})
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const [analyses,  setAnalyses]  = useState<Record<number, AnalysisResult>>({})
  const [analysing, setAnalysing] = useState<Record<number, boolean>>({})
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // ── Upload + auto-analyze ──────────────────────────────────────────────────
  async function handleUpload(idx: number, file: File) {
    setUploading(u => ({ ...u, [idx]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('itemId', `crm-${quote.id}-${idx}`)
      const res = await fetch('/api/r2-upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload échoué')
      const data = await res.json()
      setFileUrls(f => ({ ...f, [idx]: { url: data.url, name: data.name, thumb: data.url } }))

      // Lancer l'analyse automatiquement
      const item = items[idx]
      analyzeFile(idx, data.url, data.name, item)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(u => ({ ...u, [idx]: false }))
    }
  }

  // ── Analyse Claude ─────────────────────────────────────────────────────────
  async function analyzeFile(idx: number, url: string, name: string, item: any) {
    setAnalysing(a => ({ ...a, [idx]: true }))
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000) // 30s max
    try {
      const dims = item.width_cm && item.height_cm
        ? `${item.width_cm} × ${item.height_cm} cm` : undefined
      const res = await fetch('/api/crm/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          file_url: url,
          file_name: name,
          product_name: item.product_name || item.product?.name,
          dimensions: dims,
        }),
      })
      const result = await res.json()
      if (!result.error) setAnalyses(a => ({ ...a, [idx]: result }))
    } catch {
      // Timeout ou erreur réseau — on continue silencieusement
    } finally {
      clearTimeout(timeout)
      setAnalysing(a => ({ ...a, [idx]: false }))
    }
  }

  // ── Convert quote to order ─────────────────────────────────────────────────
  async function handleConvert() {
    setConverting(true)
    setError('')
    try {
      const res = await fetch(`/api/crm/quotes/${quote.id}/convert-to-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_urls: fileUrls, file_analyses: analyses, converted_by: currentUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      onConverted(data.order_number)
    } catch (e: any) {
      setError(e.message)
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Créer un bon de commande
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {quote.quote_number} · {quote.client_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Client</span>
              <span className="font-medium">{quote.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{quote.client_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Livraison</span>
              <span className="font-medium capitalize">{quote.delivery_method || 'Enlèvement'}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span className="text-slate-500 font-semibold">Total</span>
              <span className="font-bold text-blue-700">{fmt(quote.total || 0)}</span>
            </div>
          </div>

          {/* Items + file upload */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Lignes de production ({items.length})
            </p>

            {items.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                Aucun article dans ce devis. Ajoutez des lignes avant de créer le bon de commande.
              </div>
            )}

            <div className="space-y-3">
              {items.map((item: any, idx: number) => {
                const file = fileUrls[idx]
                const isUploading = uploading[idx]
                const dims = item.width_cm && item.height_cm
                  ? `${item.width_cm} × ${item.height_cm} cm`
                  : null

                return (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex gap-3">
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {item.product_name || item.product?.name || `Ligne ${idx + 1}`}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {dims && <span className="text-xs text-slate-400">{dims}</span>}
                          <span className="text-xs text-slate-400">Qté : {item.quantity || 1}</span>
                          {item.selectedDelai?.label && (
                            <span className="text-xs text-slate-400">Délai : {item.selectedDelai.label}</span>
                          )}
                          {item.unit_price != null && (
                            <span className="text-xs text-blue-600 font-medium">{fmt(item.total_price ?? item.unit_price * (item.quantity || 1))}</span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                    </div>

                    {/* File upload zone */}
                    <div className="mt-3">
                      {file ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-emerald-700 truncate flex-1">{file.name}</span>
                          <button
                            onClick={() => {
                              setFileUrls(f => { const n = { ...f }; delete n[idx]; return n })
                              setAnalyses(a => { const n = { ...a }; delete n[idx]; return n })
                            }}
                            className="text-emerald-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileRefs.current[idx]?.click()}
                          disabled={isUploading}
                          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg py-2.5 text-sm text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isUploading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload en cours…</>
                            : <><Upload className="w-4 h-4" /> Déposer le fichier client (PDF, JPG, PNG…)</>
                          }
                        </button>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        ref={el => { fileRefs.current[idx] = el }}
                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.ai,.eps"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(idx, f) }}
                      />

                      {/* Analyse Claude */}
                      {analysing[idx] && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-400 animate-pulse">Analyse en cours…</span>
                          <button
                            onClick={() => setAnalysing(a => ({ ...a, [idx]: false }))}
                            className="text-xs text-slate-400 hover:text-slate-600 underline"
                          >
                            Ignorer
                          </button>
                        </div>
                      )}
                      {!analysing[idx] && (
                        <FileAnalysisResult
                          result={analyses[idx] ?? null}
                          loading={false}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Warning if no items */}
          {items.length > 0 && Object.keys(fileUrls).length < items.length && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              💡 Les fichiers non uploadés maintenant peuvent être ajoutés plus tard depuis la page Production.
            </div>
          )}

          {/* Confirm info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Ce que cette action va faire :</p>
            <ul className="space-y-0.5 ml-2">
              <li>✓ Créer un bon de commande avec un numéro d'ordre</li>
              <li>✓ Générer {items.length} ligne{items.length > 1 ? 's' : ''} dans le tableau de production</li>
              <li>✓ Marquer ce devis comme <strong>Gagné</strong></li>
              <li>✓ Synchroniser avec Odoo</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
            Annuler
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
          >
            {converting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours…</>
              : <><Package className="w-4 h-4" /> Créer le bon de commande</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
