'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanSearch,
  Palette,
  Maximize2,
  Type,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import FileAnalysisResult, { AnalysisResult } from '@/components/crm/FileAnalysisResult'

type State = 'idle' | 'dragging' | 'uploading' | 'analysing' | 'done' | 'error'

const PRODUCTS = [
  'Banderole',
  'Bâche',
  'Roll-up',
  'Adhésif',
  'Toile tendue',
  'Drapeau',
  'Panneau rigide',
  'Affiche',
  'Autre',
]

const CHECKS_PREVIEW = [
  { icon: ScanSearch, label: 'Résolution', desc: '≥ 150 dpi en taille réelle' },
  { icon: Palette, label: 'Mode couleur', desc: 'CMJN recommandé' },
  { icon: Maximize2, label: 'Fond perdu', desc: '3–5 mm autour du format' },
  { icon: Type, label: 'Lisibilité', desc: 'Textes, sécurité et polices' },
]

export default function FileCheckerClient() {
  const [state, setState] = useState<State>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | undefined>()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [product, setProduct] = useState('')
  const [dimW, setDimW] = useState('')
  const [dimH, setDimH] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetAll = () => {
    setState('idle')
    setFileName('')
    setResult(null)
    setAnalysisError(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setResult(null)
    setAnalysisError(undefined)

    // 1. Upload
    setState('uploading')
    let fileUrl: string
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('itemId', `checker-${Date.now()}`)
      const res = await fetch('/api/r2-upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload échoué (${res.status})`)
      const data = await res.json()
      fileUrl = data.url
    } catch (err) {
      setState('error')
      setAnalysisError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
      return
    }

    // 2. Analyse
    setState('analysing')
    try {
      const body: Record<string, string> = { file_url: fileUrl, file_name: file.name }
      if (product) body.product_name = product
      if (dimW && dimH) body.dimensions = `${dimW}x${dimH}cm`
      const res = await fetch('/api/crm/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Analyse échouée (${res.status})`)
      const data: AnalysisResult = await res.json()
      setResult(data)
      setState('done')
    } catch (err) {
      setState('done') // show FileAnalysisResult with error
      setAnalysisError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
    }
  }, [product, dimW, dimH])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setState('dragging')
  }

  const onDragLeave = () => {
    if (state === 'dragging') setState('idle')
  }

  const isProcessing = state === 'uploading' || state === 'analysing'

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-5">
            <ScanSearch className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Vérifiez votre fichier<br />avant de commander
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Analyse IA en quelques secondes — résolution, mode colorimétrique,
            fond perdu, lisibilité.
          </p>
        </div>

        {/* Ce qu'on vérifie */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {CHECKS_PREVIEW.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center bg-sky-100/50 rounded-xl p-3 gap-2">
              <Icon className="w-5 h-5 text-blue-600" />
              <p className="text-xs font-semibold text-slate-800">{label}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{desc}</p>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={[
            'relative rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none',
            'flex flex-col items-center justify-center gap-4 py-14 px-6 text-center',
            state === 'dragging'
              ? 'bg-blue-50 border-blue-400'
              : isProcessing
              ? 'bg-sky-100/50 border-slate-200 cursor-default'
              : 'bg-sky-50/60 border-sky-200 hover:border-blue-400 hover:bg-blue-50/40',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
            className="hidden"
            onChange={onFileChange}
            disabled={isProcessing}
          />

          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-slate-700 text-sm">
                  {state === 'uploading' ? 'Envoi du fichier…' : 'Analyse IA en cours…'}
                </p>
                {fileName && (
                  <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{fileName}</p>
                )}
              </div>
            </>
          ) : state === 'done' ? (
            <>
              <FileText className="w-10 h-10 text-blue-600" />
              <p className="font-semibold text-slate-700 text-sm truncate max-w-xs">{fileName}</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-300" />
              <div>
                <p className="font-semibold text-slate-700">Glissez votre fichier ici</p>
                <p className="text-sm text-slate-400 mt-1">PDF, JPG, PNG, TIFF acceptés</p>
              </div>
              <span className="inline-block text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-4 py-2 bg-white hover:bg-blue-50 transition-colors">
                Ou cliquer pour sélectionner
              </span>
            </>
          )}
        </div>

        {/* Options facultatives */}
        {!isProcessing && state !== 'done' && (
          <div className="mt-4">
            <button
              onClick={() => setOptionsOpen(o => !o)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {optionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Options facultatives (produit, dimensions)
            </button>

            {optionsOpen && (
              <div className="mt-3 p-4 rounded-xl bg-sky-100/50 border border-slate-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Produit concerné</label>
                  <select
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sélectionner —</option>
                    {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dimensions (cm)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Largeur"
                      value={dimW}
                      onChange={e => setDimW(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-400 font-medium">×</span>
                    <input
                      type="number"
                      placeholder="Hauteur"
                      value={dimH}
                      onChange={e => setDimH(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Résultat analyse */}
        {(state === 'done' || state === 'analysing') && (
          <div className="mt-6">
            <FileAnalysisResult
              result={result}
              loading={state === 'analysing'}
              error={analysisError}
            />
          </div>
        )}

        {/* CTA contextuel */}
        {state === 'done' && result && (
          <div className="mt-6">
            {result.status === 'ok' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-800 flex-1">
                  Votre fichier est prêt pour l'impression !
                </p>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Passer commande →
                </Link>
              </div>
            )}

            {result.status === 'warning' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800 flex-1">
                  Quelques points à améliorer, mais la commande reste possible.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Link
                    href="/catalogue"
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Commander quand même →
                  </Link>
                  <Link
                    href="/devis"
                    className="inline-flex items-center gap-1.5 border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Obtenir de l'aide
                  </Link>
                </div>
              </div>
            )}

            {result.status === 'error' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Des corrections sont nécessaires avant impression.
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Consultez les détails de l'analyse ci-dessus pour corriger votre fichier.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Link
                    href="/devis"
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Demander un devis
                  </Link>
                  <a
                    href="mailto:info@comink.be"
                    className="inline-flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-100 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Contacter Comink
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tester un autre fichier */}
        {state === 'done' && (
          <div className="mt-5 text-center">
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Tester un autre fichier
            </button>
          </div>
        )}

        {/* Footer reassurance */}
        <p className="text-center text-xs text-slate-400 mt-10">
          Analyse confidentielle — votre fichier n'est pas conservé. Service gratuit sans inscription.
        </p>
      </div>
    </div>
  )
}
