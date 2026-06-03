'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Upload, FileText, ScanSearch, Palette, Maximize2, Type, RotateCcw, Download } from 'lucide-react'
import FileAnalysisResult, { AnalysisResult } from '@/components/crm/FileAnalysisResult'
import { generateAnalysisReport } from '@/lib/generateAnalysisReport'
import LottiePlayer from '@/components/ui/LottiePlayer'

// ── Indicateur résultat animé ─────────────────────────────────────────────────
function ResultIndicator({ status, score }: { status: 'ok' | 'warning' | 'error'; score: number }) {
  const config = {
    ok:      { emoji: '👍', label: 'Prêt pour l\'impression',   bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', score: 'text-emerald-600' },
    warning: { emoji: '👉', label: 'Quelques points à vérifier', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   score: 'text-amber-600'   },
    error:   { emoji: '👎', label: 'Corrections nécessaires',    bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     score: 'text-red-600'     },
  }[status]

  return (
    <motion.div
      className={`flex items-center gap-4 rounded-2xl border-2 p-5 ${config.bg} ${config.border}`}
      initial={{ scale: 0.5, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      <motion.span
        className="text-5xl select-none"
        initial={{ rotate: -30 }}
        animate={{ rotate: [0, 15, -5, 0] }}
        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
      >
        {config.emoji}
      </motion.span>
      <div>
        <p className={`font-black text-xl ${config.score}`}>{score}<span className="text-sm font-normal opacity-60">/100</span></p>
        <p className={`font-bold text-sm ${config.text}`}>{config.label}</p>
      </div>
    </motion.div>
  )
}

type State = 'idle' | 'dragging' | 'uploading' | 'analysing' | 'done'

// ── Extraction dimensions depuis le nom de fichier ───────────────────────────
function extractDimensions(filename: string): { w: number; h: number; label: string } | null {
  // Patterns : 240x120, 240×120, 240*120, 240 x 120, 240X120, etc.
  const match = filename.match(/(\d+(?:[.,]\d+)?)\s*[x×xX*]\s*(\d+(?:[.,]\d+)?)/i)
  if (!match) return null
  const w = parseFloat(match[1].replace(',', '.'))
  const h = parseFloat(match[2].replace(',', '.'))
  if (!w || !h) return null
  return { w, h, label: `${w} × ${h} cm` }
}

// ── Thumbnail image via Canvas (sans dépendance externe) ──────────────────────
async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}

// ── Config produits avec exigences prépresse ─────────────────────────────────
// ── Règles prépresse par catégorie ───────────────────────────────────────────
const CATEGORY_RULES: Record<string, { icon: string; bleed: string; diecut: boolean }> = {
  banderoles:            { icon: '🎪', bleed: '3-5mm', diecut: false },
  baches:                { icon: '🏗️', bleed: '3-5mm', diecut: false },
  toiles:                { icon: '🖼️', bleed: '3-5mm', diecut: false },
  roll_up:               { icon: '📜', bleed: '3mm',   diecut: false },
  drapeaux:              { icon: '🚩', bleed: '3mm',   diecut: false },
  adhesifs:              { icon: '🏷️', bleed: '3mm',   diecut: true  },
  vinyle_autocollant:    { icon: '🏷️', bleed: '3mm',   diecut: true  },
  panneaux:              { icon: '📌', bleed: '3mm',   diecut: false },
  supports_evenementiels:{ icon: '🎪', bleed: '3mm',   diecut: false },
  textile:               { icon: '👕', bleed: '0mm',   diecut: false },
  papier:                { icon: '🗞️', bleed: '3mm',   diecut: false },
  accessoires:           { icon: '📦', bleed: '0mm',   diecut: false },
}
const DEFAULT_RULE = { icon: '📄', bleed: '3mm', diecut: false }

interface CatalogProduct {
  id: string
  name: string
  category: string
  bleed: string
  diecut: boolean
  icon: string
}


export default function FileCheckerClient() {
  const [state, setState] = useState<State>('idle')
  const [fileName, setFileName] = useState('')
  const [fileSizeMB, setFileSizeMB] = useState(0)
  const [dims, setDims] = useState<{ w: number; h: number; label: string } | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | undefined>()
  // Catalogue réel depuis Supabase
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  // Sélection produit + dimensions commandées
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [orderedW, setOrderedW] = useState('')
  const [orderedH, setOrderedH] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const orderedDims = selectedProduct && orderedW && orderedH
    ? `${orderedW} × ${orderedH} cm`
    : null

  // Chargement du catalogue réel
  React.useEffect(() => {
    fetch('/api/products/public')
      .then(r => r.json())
      .then((data: Array<{ id: string; name: string; category: string; available: boolean }>) => {
        const available = (Array.isArray(data) ? data : [])
          .filter(p => p.available !== false)
          .map(p => {
            const rule = CATEGORY_RULES[p.category] ?? DEFAULT_RULE
            return { id: p.id, name: p.name, category: p.category, ...rule }
          })
        setProducts(available)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [])

  const reset = () => {
    setState('idle'); setFileName(''); setFileSizeMB(0); setDims(null)
    setResult(null); setErrorMsg(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  const analyse = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isPDF   = ext === 'pdf'
    const isImage = ['jpg','jpeg','png','tiff','tif','webp'].includes(ext)
    const sizeMB  = Math.round(file.size / 1024 / 1024 * 10) / 10

    const detectedDims = extractDimensions(file.name)
    setFileName(file.name); setFileSizeMB(sizeMB); setDims(detectedDims)
    setResult(null); setErrorMsg(undefined)

    if (!isPDF && !isImage) {
      setState('done')
      setResult({ score: 50, status: 'warning',
        summary: `Format ${ext.toUpperCase()} — exportez en PDF ou JPG pour l'analyse.`,
        checks: [{ id: 'format', label: 'Format', status: 'warning',
          message: `Les fichiers .${ext} ne peuvent pas être analysés automatiquement.`,
          detail: 'Exportez en PDF ou JPG haute résolution.' }],
        recommendations: ['Exportez en PDF ou JPG pour l\'analyse automatique.'] })
      return
    }

    // ── Images : resize côté client puis analyser via preview ─────────────────
    if (isImage) {
      setState('analysing')
      try {
        const preview = await resizeImage(file)
        const res = await fetch('/api/crm/analyze-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preview_base64: preview,
            file_name: file.name,
            file_size_mb: sizeMB,
            dimensions: orderedDims || detectedDims?.label,
            product_name: selectedProduct?.name,
            product_bleed: selectedProduct?.bleed,
            product_diecut: selectedProduct?.diecut,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
        setResult({ ...data, checks: data.checks ?? [] }); setState('done')
      } catch (e: any) {
        setState('done'); setErrorMsg(e.message || 'Erreur lors de l\'analyse')
      }
      return
    }

    // ── PDFs : upload vers R2 puis analyser (fonctionne jusqu'à 32MB) ─────────
    if (sizeMB > 32) {
      // Fichier trop lourd — analyse manuelle
      setState('done')
      setResult({ score: 65, status: 'warning',
        summary: `Fichier volumineux (${sizeMB} MB) — analyse manuelle recommandée.`,
        checks: [
          { id: 'resolution', label: 'Résolution', status: 'ok',
            message: 'Un fichier lourd est généralement signe de bonne résolution.',
            detail: 'Vérification manuelle par Comink à la réception.' },
          { id: 'format', label: 'Taille fichier', status: 'warning',
            message: `${sizeMB} MB — trop volumineux pour l'analyse IA automatique (limite 32 MB).`,
            detail: 'Vous pouvez envoyer votre fichier par WeTransfer ou FTP.' },
        ],
        recommendations: ['Envoyez votre fichier via WeTransfer et transmettez le lien par email à info@comink.be'] })
      return
    }

    // Upload PDF + analyse
    setState('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('itemId', `checker-${Date.now()}`)
      const upRes = await fetch('/api/r2-upload', { method: 'POST', body: fd })
      if (!upRes.ok) throw new Error('Upload échoué')
      const { url, name } = await upRes.json()

      setState('analysing')
      const res = await fetch('/api/crm/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: url,
          file_name: name,
          dimensions: orderedDims || detectedDims?.label,
          product_name: selectedProduct?.name,
          product_bleed: selectedProduct?.bleed,
          product_diecut: selectedProduct?.diecut,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
      // Garantir que checks est toujours un tableau
      setResult({ ...data, checks: data.checks ?? [] }); setState('done')
    } catch (e: any) {
      setState('done'); setErrorMsg(e.message || 'Erreur lors de l\'analyse')
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setState('idle')
    const file = e.dataTransfer.files?.[0]
    if (file) analyse(file)
  }

  const isProcessing = state === 'uploading' || state === 'analysing'
  const isDone = state === 'done'

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-5">
            <ScanSearch className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Vérifiez votre fichier<br />avant de commander
          </h1>
          <p className="text-slate-500 text-base">Analyse IA — résolution, couleur, fond perdu, lisibilité.</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {([
            { icon: ScanSearch, label: 'Résolution' },
            { icon: Palette,    label: 'Mode couleur' },
            { icon: Maximize2,  label: 'Fond perdu' },
            { icon: Type,       label: 'Lisibilité' },
          ] as const).map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center text-center bg-white rounded-xl p-3 gap-1.5 border border-slate-100">
              <Icon className="w-5 h-5 text-blue-600" />
              <p className="text-xs font-semibold text-slate-700">{label}</p>
            </div>
          ))}
        </div>

        <input ref={inputRef} id="fc-input" type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
          className="hidden" disabled={isProcessing}
          onChange={e => { const f = e.target.files?.[0]; if (f) analyse(f) }} />

        {/* ── Sélection produit + dimensions commandées ── */}
        {!isDone && !isProcessing && (
          <div className="space-y-4 mb-2">
            {/* Grille produits du catalogue */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                1. Quel produit avez-vous commandé ?
              </p>
              {loadingProducts ? (
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)}
                      className={[
                        'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition-all text-left',
                        selectedProduct?.id === p.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200',
                      ].join(' ')}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span className="leading-tight text-center line-clamp-2">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dimensions commandées */}
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <span className="text-sm font-bold text-slate-600 flex-shrink-0">2. Dimensions commandées</span>
                <input
                  type="number" value={orderedW} onChange={e => setOrderedW(e.target.value)}
                  placeholder="Largeur" className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400 font-bold">×</span>
                <input
                  type="number" value={orderedH} onChange={e => setOrderedH(e.target.value)}
                  placeholder="Hauteur" className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400 text-sm">cm</span>
                {selectedProduct.diecut && (
                  <span className="ml-auto text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full flex-shrink-0">
                    ✂️ Tracé requis
                  </span>
                )}
                {!selectedProduct.diecut && (
                  <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
                    Fond perdu : {selectedProduct.bleed}
                  </span>
                )}
              </motion.div>
            )}

            {/* Séparateur */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs font-bold text-slate-400">3. Déposez votre fichier</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </div>
        )}

        {!isDone && (
          <div onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setState('dragging') }}
            onDragLeave={() => { if (state === 'dragging') setState('idle') }}
            className={[
              'rounded-2xl border-2 border-dashed transition-all',
              'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
              state === 'dragging' ? 'bg-blue-50 border-blue-400' :
              isProcessing ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200',
            ].join(' ')}
          >
            {isProcessing ? (
              <>
                <LottiePlayer
                  src="/animations/scan.json"
                  className="w-40 h-40"
                  loop
                  autoplay
                />
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-base">
                    {state === 'uploading' ? 'Envoi du fichier…' : 'Analyse IA en cours…'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{fileName} · {fileSizeMB > 0 ? `${fileSizeMB} MB` : ''}</p>
                  <p className="text-xs text-blue-500 mt-2 animate-pulse">Claude vérifie votre fichier…</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-300" />
                <div>
                  <p className="font-bold text-slate-800 text-lg">Glissez votre fichier ici</p>
                  <p className="text-slate-400 text-sm mt-1">PDF (≤32 MB), JPG, PNG — toutes résolutions</p>
                </div>
                <label htmlFor="fc-input"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl cursor-pointer transition-colors text-sm">
                  <Upload className="w-4 h-4" /> Choisir un fichier
                </label>
                <p className="text-xs text-slate-300">Le fichier n'est jamais envoyé à nos serveurs (images)</p>
              </>
            )}
          </div>
        )}

        {isDone && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {fileSizeMB > 0 && <span className="text-xs text-slate-400">{fileSizeMB} MB</span>}
                  {dims && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      📐 {dims.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Indicateur résultat animé — s'arrête après l'animation */}
            {result && !errorMsg && (
              <ResultIndicator status={result.status} score={result.score ?? 0} />
            )}
            <FileAnalysisResult result={result} loading={false} error={errorMsg} />

            {result && !errorMsg && (
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                result.status === 'ok'      ? 'bg-emerald-50 border-emerald-200' :
                result.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                                              'bg-red-50 border-red-200'}`}>
                <div>
                  <p className={`font-bold text-sm ${
                    result.status === 'ok' ? 'text-emerald-800' :
                    result.status === 'warning' ? 'text-amber-800' : 'text-red-800'}`}>
                    {result.status === 'ok'      ? '✓ Fichier prêt pour l\'impression' :
                     result.status === 'warning' ? '⚠ Quelques points à vérifier' :
                                                   '✗ Corrections recommandées'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Vérification finale par Comink à la réception</p>
                </div>
                <Link href={result.status === 'error' ? '/devis' : '/catalogue'}
                  className={`flex-shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors ${
                    result.status === 'ok'      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                    result.status === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                                                  'bg-red-600 hover:bg-red-700 text-white'}`}>
                  {result.status === 'error' ? 'Demander de l\'aide →' : 'Passer commande →'}
                </Link>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {result && !errorMsg && (
                <button
                  onClick={() => generateAnalysisReport({ fileName, fileSizeMB, dimensions: dims?.label }, result)}
                  className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" /> Télécharger le rapport PDF
                </button>
              )}
              <button onClick={reset}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Tester un autre fichier
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-10">
          Service gratuit · Sans inscription · Images analysées localement
        </p>
      </div>
    </div>
  )
}
