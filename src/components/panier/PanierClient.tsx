'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Trash2, ShoppingBag, ArrowRight, CheckCircle, Upload,
  AlertTriangle, FileCheck, X, Pen, RotateCcw, FileText,
  ChevronRight, Loader2, Truck, Package, MapPin, CreditCard, Building
} from 'lucide-react'
import { useCart, type CartItem, type CartFile } from '@/hooks/useCart'
import { formatPrice, isIntraCommunityVAT, isBelgianVAT, isValidVAT, calcVAT, calcTTC, calcDeliveryCost } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingAddress {
  id: string
  label: string
  name: string
  line1: string
  line2?: string
  city: string
  postal_code?: string
  country: string
  is_default: boolean
}

interface ValidationResult {
  ok: boolean
  dimensions: { width_mm: number; height_mm: number }
  colorspace: string
  pages: number
  dpi: number | null
  dpi_status: 'ok' | 'warn' | 'error' | 'unknown'
  width_px: number
  height_px: number
  warnings: string[]
  dimensionMatch: boolean
  suggestedScale: number | null
}

type Step = 1 | 2 | 3

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: 'Fichiers & références' },
    { n: 2, label: 'Bon À Tirer' },
    { n: 3, label: 'Paiement' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8 w-full max-w-xl mx-auto">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold border-2 transition-all ${
              current > s.n
                ? 'border-green-500 text-white'
                : current === s.n
                ? 'text-white shadow-lg'
                : 'text-slate-400'
            }`} style={
              current > s.n
                ? { background: '#00AEEF', borderColor: '#00AEEF' }
                : current === s.n
                ? { background: '#00AEEF', borderColor: '#00AEEF' }
                : { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }
            }>
              {current > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${current === s.n ? '' : current > s.n ? 'text-green-400' : 'text-slate-400'}`}
              style={current === s.n ? { color: '#00AEEF' } : undefined}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${current > s.n + 1 || (current > s.n) ? 'bg-green-400' : ''}`}
              style={!(current > s.n + 1 || current > s.n) ? { background: 'rgba(255,255,255,0.1)' } : undefined} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── File upload zone per item ─────────────────────────────────────────────────

interface FileZoneProps {
  item: CartItem
  onValidated: (patch: Partial<CartItem>) => void
}

// ── Analyse complète d'un PDF via PDF.js — une seule passe ───────────────────
// Retourne : pages count, dimensions par page, preview JPEG page 1, hint CMYK
interface PdfAnalysis {
  pageCount: number
  pages: Array<{ widthMm: number; heightMm: number }>
  previewDataUrl: string | null
  cmykHint: 'cmyk' | 'rgb' | 'unknown'
  thumbs: Record<number, string>   // pageIndex (1-based) → dataUrl miniature
}

async function analyzePdfClientSide(file: File, maxPages = 50): Promise<PdfAnalysis> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const arrayBuffer = await file.arrayBuffer()

    // CMYK scan sur le buffer déjà chargé (pas de 2e lecture fichier)
    const cmykHint = await scanCmykHint(file, arrayBuffer)
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const PT_TO_MM = 0.352778
    const pageCount = pdf.numPages
    const limit = Math.min(pageCount, maxPages)

    const pages: Array<{ widthMm: number; heightMm: number }> = []
    const thumbs: Record<number, string> = {}
    let previewDataUrl: string | null = null
    const THUMB_SIZE = 80
    const PREVIEW_MAX = 1500

    for (let i = 1; i <= limit; i++) {
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale: 1 })

      // Dimensions réelles depuis le viewport PDF.js (fiable même pour PDF compressé)
      pages.push({
        widthMm:  Math.round(vp.width  * PT_TO_MM),
        heightMm: Math.round(vp.height * PT_TO_MM),
      })

      // Miniature 80×80 pour chaque page
      const thumbScale = THUMB_SIZE / Math.max(vp.width, vp.height)
      const tvp = page.getViewport({ scale: thumbScale })
      const tc = document.createElement('canvas')
      tc.width  = Math.round(tvp.width)
      tc.height = Math.round(tvp.height)
      await (page.render as any)({ canvasContext: tc.getContext('2d'), viewport: tvp }).promise
      thumbs[i] = tc.toDataURL('image/jpeg', 0.75)

      // Aperçu haute résolution page 1 pour Claude
      if (i === 1) {
        const pscale = Math.min(PREVIEW_MAX / vp.width, PREVIEW_MAX / vp.height, 3.0)
        const pvp = page.getViewport({ scale: pscale })
        const pc = document.createElement('canvas')
        pc.width  = Math.round(pvp.width)
        pc.height = Math.round(pvp.height)
        await (page.render as any)({ canvasContext: pc.getContext('2d'), viewport: pvp }).promise
        previewDataUrl = pc.toDataURL('image/jpeg', 0.85)
      }
    }

    return { pageCount, pages, previewDataUrl, cmykHint, thumbs }
  } catch {
    // En cas d'erreur PDF.js, tenter le scan CMYK seul
    const fallbackHint = await scanCmykHint(file).catch(() => 'unknown' as const)
    return { pageCount: 1, pages: [], previewDataUrl: null, cmykHint: fallbackHint, thumbs: {} }
  }
}

// ── Compare dimensions fichier vs commande avec fonds perdus ─────────────────
function checkDimensions(
  fileMm: { widthMm: number; heightMm: number },
  orderedCm: { widthCm: number; heightCm: number },
  bleedMm = 3   // fonds perdus requis (par défaut 3mm de chaque côté)
): 'ok' | 'bleed' | 'error' {
  const ow = orderedCm.widthCm * 10  // mm
  const oh = orderedCm.heightCm * 10
  const fw = fileMm.widthMm
  const fh = fileMm.heightMm
  // Tolérance = bleed × 2 (chaque côté) + 2mm de marge technique
  const tolerance = bleedMm * 2 + 2
  // Accepter aussi orientation inversée
  const matchNormal  = Math.abs(fw - ow) <= tolerance && Math.abs(fh - oh) <= tolerance
  const matchRotated = Math.abs(fw - oh) <= tolerance && Math.abs(fh - ow) <= tolerance
  if (matchNormal || matchRotated) {
    // Fichier légèrement plus grand que commandé → fonds perdus présents
    const hasBleed = (fw > ow + 1 || fh > oh + 1) || (fw > oh + 1 || fh > ow + 1)
    return hasBleed ? 'bleed' : 'ok'
  }
  return 'error'
}

// ── Calcule le ratio de mise à l'échelle si les proportions fichier ≈ commande ─
// Retourne null si les proportions ne correspondent pas (format incompatible)
// Exemples : 210×297 mm → 420×594 mm → scale 2.0 ; 1000×1000 mm → 100×100 mm → scale 0.1
function computeSuggestedScale(
  fileMm: { widthMm: number; heightMm: number },
  orderedCm: { widthCm: number; heightCm: number }
): number | null {
  const ow = orderedCm.widthCm * 10  // mm
  const oh = orderedCm.heightCm * 10
  const fw = fileMm.widthMm
  const fh = fileMm.heightMm
  if (!fw || !fh || !ow || !oh) return null

  // Tolérance de proportionnalité : les deux ratios doivent être à < 5% l'un de l'autre
  const PROP_TOL = 0.05

  // Orientation normale : fw/ow ≈ fh/oh
  const scaleNW = ow / fw
  const scaleNH = oh / fh
  if (Math.abs(scaleNW - scaleNH) / Math.max(scaleNW, scaleNH) < PROP_TOL) {
    const scale = Math.round(((scaleNW + scaleNH) / 2) * 1000) / 1000
    if (Math.abs(scale - 1) > 0.02) return scale  // ≠ 1 → vraie mise à l'échelle
  }

  // Orientation inversée (fichier en portrait, commande en paysage ou vice-versa)
  const scaleRW = ow / fh
  const scaleRH = oh / fw
  if (Math.abs(scaleRW - scaleRH) / Math.max(scaleRW, scaleRH) < PROP_TOL) {
    const scale = Math.round(((scaleRW + scaleRH) / 2) * 1000) / 1000
    if (Math.abs(scale - 1) > 0.02) return scale
  }

  return null  // proportions incompatibles → pas de mise à l'échelle possible
}

// ── Scan CMYK depuis les bytes bruts du PDF ───────────────────────────────────
// Accepte un ArrayBuffer déjà chargé pour éviter une 2e lecture du fichier
async function scanCmykHint(file: File, existingBuffer?: ArrayBuffer): Promise<'cmyk' | 'rgb' | 'unknown'> {
  try {
    const buffer = existingBuffer ?? await file.arrayBuffer()
    // Décode en latin-1 : les bytes bruts (même compressés) restent cherchables
    const text = new TextDecoder('latin1').decode(new Uint8Array(buffer))

    // 1. Espaces colorimétriques déclarés en clair dans la structure PDF
    if (/\/DeviceCMYK|\/CalCMYK/.test(text))          return 'cmyk'
    if (/\/Separation|\/DeviceN/.test(text))           return 'cmyk' // couleurs spot = CMYK
    if (/\/DeviceRGB|\/CalRGB/.test(text))             return 'rgb'

    // 2. Signature texte des profils ICC embarqués (en clair dans les streams)
    //    Header ICC offset+16 = color space : 'CMYK' ou 'RGB '
    if (text.includes('CMYK'))  return 'cmyk'
    if (text.includes('RGB '))  return 'rgb'   // 'RGB ' avec espace = header ICC

    // 3. Mot-clé sRGB dans les métadonnées XMP (souvent en clair)
    if (/sRGB|AdobeRGB/.test(text)) return 'rgb'

    return 'unknown'
  } catch { return 'unknown' }
}

// ── Génère un aperçu JPEG haute qualité page 1 (conservé pour SingleFileZone) ─
async function generatePdfAnalysisPreview(file: File): Promise<string | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const MAX_PX = 1500
    const scale = Math.min(MAX_PX / viewport.width, MAX_PX / viewport.height, 3.0)
    const scaled = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(scaled.width)
    canvas.height = Math.round(scaled.height)
    const ctx = canvas.getContext('2d')!
    await (page.render as any)({ canvasContext: ctx, viewport: scaled }).promise
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch { return null }
}

// ── Upload un preview dataURL vers R2 avec clé prédictible ───────────────────
async function uploadPreviewToR2(dataUrl: string, mainKey: string): Promise<string | null> {
  try {
    const blob = await fetch(dataUrl).then(r => r.blob())
    const presignRes = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'preview.jpg', contentType: 'image/jpeg', mainKey }),
    })
    const { presignedUrl, publicUrl } = await presignRes.json()
    await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
    return publicUrl
  } catch { return null }
}

// Génère une miniature base64 à partir d'un fichier image (80×80 px)
async function generateImageThumb(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const SIZE = 80
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')!
      // Crop centré
      const ratio = Math.min(SIZE / img.width, SIZE / img.height)
      const w = img.width * ratio
      const h = img.height * ratio
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── Multi-file zone (quantity > 1) ───────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 11)

function MultiFileZone({ item, onValidated }: FileZoneProps) {
  const addInputRef = useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({})
  const [uploadPhaseMap, setUploadPhaseMap] = useState<Record<string, 'upload'|'analyze'>>({})
  const [slotAnalysis, setSlotAnalysis] = useState<Record<string, any>>({})
  const [slotResults, setSlotResults] = useState<Record<string, ValidationResult>>({})
  const [slotScales, setSlotScales] = useState<Record<string, boolean>>({})

  // Initialise les fichiers depuis le cart (persisted)
  const [files, setFiles] = useState<CartFile[]>(() => {
    if (item.files?.length) return item.files
    if (item.file_url) return [{
      id: genId(),
      file_url:       item.file_url,
      file_name:      item.file_name,
      file_thumb:     item.file_thumb,
      file_validated: item.file_validated,
      file_info:      item.file_info,
      file_scale:     item.file_scale,
      copies:         item.quantity,
    }]
    return []
  })

  const totalCopies  = files.reduce((s, f) => s + f.copies, 0)
  const remaining    = item.quantity - totalCopies
  const allValid     = files.length > 0
    && files.every(f => f.file_validated)
    && totalCopies === item.quantity

  const syncToCart = useCallback((updated: CartFile[]) => {
    const tot   = updated.reduce((s, f) => s + f.copies, 0)
    const valid = updated.length > 0 && updated.every(f => f.file_validated) && tot === item.quantity
    onValidated({ files: updated, file_validated: valid, file_url: updated[0]?.file_url })
  }, [item.quantity, onValidated])

  const updateCopies = (id: string, val: number) => {
    // Minimum 1 exemplaire par visuel (chaque ligne = 1 visuel distinct)
    const updated = files.map(f => f.id === id ? { ...f, copies: Math.max(1, val) } : f)
    setFiles(updated)
    syncToCart(updated)
  }

  const removeSlot = (id: string) => {
    const updated = files.filter(f => f.id !== id)
    setFiles(updated)
    syncToCart(updated)
  }

  const handleAddFile = useCallback(async (file: File) => {
    const slotId = genId()
    const isPdf  = file.name.toLowerCase().endsWith('.pdf')
    const MAX_PAGES = 50  // sécurité : pas de création de 1000 slots

    // Placeholder visible immédiatement
    setFiles(prev => [...prev, { id: slotId, file_name: file.name, copies: 0 }])
    setUploadingId(slotId)
    setUploadPhaseMap(m => ({ ...m, [slotId]: 'upload' }))
    setUploadProgressMap(m => ({ ...m, [slotId]: 0 }))

    try {
      // 1. Upload R2 via URL pré-signée
      const presignRes = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', itemId: `${item.id}_${slotId}` }),
      })
      const presignData = await presignRes.json()
      if (!presignRes.ok || !presignData.presignedUrl) throw new Error(presignData.error || 'Presign error')

      const fileUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgressMap(m => ({ ...m, [slotId]: Math.round(e.loaded / e.total * 100) })) }
        xhr.onload = () => { xhr.status === 200 ? resolve(presignData.publicUrl) : reject(new Error(`Upload R2 failed: ${xhr.status}`)) }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('PUT', presignData.presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      // 2. Analyse PDF complète via PDF.js (une seule passe : pages, dimensions, preview, thumbs)
      setUploadPhaseMap(m => ({ ...m, [slotId]: 'analyze' }))
      const pdfData = isPdf ? await analyzePdfClientSide(file, MAX_PAGES) : null
      const totalPages = Math.min(pdfData?.pageCount ?? 1, MAX_PAGES)
      const pageDims   = pdfData?.pages ?? []

      // 3. Calculer les copies à distribuer
      const copiesBeforeThis = files.reduce((s, f) => s + f.copies, 0)
      const copiesPerPage = Math.max(1, Math.floor(Math.max(totalPages, item.quantity - copiesBeforeThis) / totalPages))

      // 4. Créer les slots (1 par page PDF, 1 pour image)
      const newSlots: CartFile[] = totalPages > 1
        ? Array.from({ length: totalPages }, (_, i) => {
            const dim = pageDims[i] ?? pageDims[0] ?? { widthMm: 0, heightMm: 0 }
            return {
              id:             i === 0 ? slotId : genId(),
              file_url:       fileUrl,
              file_name:      file.name,
              file_thumb:     pdfData?.thumbs[i + 1] ?? undefined,
              file_validated: true,
              file_info:      { width_mm: dim.widthMm, height_mm: dim.heightMm, colorspace: 'unknown', pages: totalPages, dpi: null },
              copies:         copiesPerPage,
              page_index:     i + 1,
              total_pages:    totalPages,
            }
          })
        : [{
            id:             slotId,
            file_url:       fileUrl,
            file_name:      file.name,
            file_thumb:     pdfData?.thumbs[1] ?? undefined,
            file_validated: true,
            file_info:      { width_mm: pageDims[0]?.widthMm ?? 0, height_mm: pageDims[0]?.heightMm ?? 0, colorspace: 'unknown', pages: 1, dpi: null },
            copies:         Math.max(1, item.quantity - copiesBeforeThis),
          }]

      // Remplacer le placeholder par les vrais slots (avec thumbs déjà inclus)
      setFiles(prev => [...prev.filter(f => f.id !== slotId), ...newSlots])
      syncToCart([...files.filter(f => f.id !== slotId), ...newSlots])

      // Pour les images (non-PDF) : générer la miniature
      if (!isPdf) {
        const thumb = await generateImageThumb(file)
        if (thumb) setFiles(prev => prev.map(f => f.id === slotId ? { ...f, file_thumb: thumb } : f))
      }

      // 5. Analyse Claude (preview + CMYK hint + dimensions réelles)
      const dims = item.width_cm && item.height_cm ? `${item.width_cm} × ${item.height_cm} cm` : undefined
      const cmykHint    = pdfData?.cmykHint ?? 'unknown'
      const previewDataUrl = pdfData?.previewDataUrl ?? null
      const analysisUrl = previewDataUrl ? await uploadPreviewToR2(previewDataUrl, presignData.key) : null
      const detectedDims = pageDims[0]
        ? `${(pageDims[0].widthMm / 10).toFixed(1)} × ${(pageDims[0].heightMm / 10).toFixed(1)} cm (MediaBox PDF.js)`
        : undefined
      const bleedMmValue = (item as any).bleed_mm ?? (item.product as any)?.bleed_mm ?? 3

      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 60_000)
      try {
        const r = await fetch('/api/crm/analyze-file', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({
            file_url:      fileUrl,
            analysis_url:  analysisUrl,
            cmyk_hint:     cmykHint,
            file_name:     file.name,
            dimensions:    dims,
            detected_dims: detectedDims,
            product_bleed: bleedMmValue > 0 ? `${bleedMmValue}mm de chaque côté` : undefined,
          }),
        })
        const analysis = await r.json()
        if (!analysis.error) {
          setSlotAnalysis(prev => {
            const patch: Record<string, any> = {}
            newSlots.forEach(s => { patch[s.id] = analysis })
            return { ...prev, ...patch }
          })
          // Persister l'analyse dans le cart pour le BAT
          const withAnalysis = (prev: CartFile[]) =>
            prev.map(f => newSlots.find(s => s.id === f.id) ? { ...f, file_analysis: analysis } : f)
          setFiles(prev => { const u = withAnalysis(prev); syncToCart(u); return u })
        }
      } catch { /* silent */ }

    } catch (err) {
      console.error(err)
      setFiles(prev => prev.filter(f => f.id !== slotId))
      syncToCart(files.filter(f => f.id !== slotId))
    } finally {
      setUploadingId(null)
    }
  }, [files, item.id, item.quantity, item.width_cm, item.height_cm, syncToCart])

  const acceptScale = (slotId: string, scale: number) => {
    setSlotScales(prev => ({ ...prev, [slotId]: true }))
    const updated = files.map(f => f.id === slotId ? { ...f, file_scale: scale, file_validated: true } : f)
    setFiles(updated)
    syncToCart(updated)
  }

  const skipScale = (slotId: string) => {
    setSlotScales(prev => ({ ...prev, [slotId]: true }))
    const updated = files.map(f => f.id === slotId ? { ...f, file_validated: true } : f)
    setFiles(updated)
    syncToCart(updated)
  }

  return (
    <div className="mt-3 space-y-2">

      {/* ── En-tête : titre + compteur ── */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          Visuels ({files.filter(f => f.file_url).length})
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          totalCopies === item.quantity ? 'text-emerald-400'
          : totalCopies > item.quantity ? 'text-red-400'
          : 'text-slate-400'
        }`} style={
          totalCopies === item.quantity ? { background: 'rgba(16,185,129,0.15)' }
          : totalCopies > item.quantity ? { background: 'rgba(239,68,68,0.15)' }
          : { background: 'rgba(255,255,255,0.08)' }
        }>
          {totalCopies} / {item.quantity} ex.
        </span>
      </div>

      {/* ── Liste des visuels ── */}
      <div className="rounded-xl overflow-hidden divide-y" style={{ border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>

        {files.map((f, idx) => {
          const isUp    = uploadingId === f.id
          const vr      = slotResults[f.id]
          const scAcc   = slotScales[f.id] ?? false
          const isPDF   = f.file_name?.toLowerCase().endsWith('.pdf')
          const cs      = vr?.colorspace ?? f.file_info?.colorspace
          const dpi     = vr?.dpi ?? f.file_info?.dpi
          const dpSt    = vr?.dpi_status ?? (dpi == null ? 'unknown' : dpi >= 150 ? 'ok' : dpi >= 72 ? 'warn' : 'error')
          const hasIssue = (f.file_url && !f.file_validated && !scAcc) || cs === 'RGB' || dpSt === 'error'
          const minCopy  = 1   // chaque ligne = 1 visuel distinct, min 1 exemplaire

          // Vérification dimensions fichier vs commande
          const itemBleedMm = (item as any).bleed_mm ?? (item.product as any)?.bleed_mm ?? 3
          const dimStatus = (f.file_info?.width_mm && f.file_info?.height_mm && item.width_cm && item.height_cm)
            ? checkDimensions(
                { widthMm: f.file_info.width_mm as number, heightMm: f.file_info.height_mm as number },
                { widthCm: item.width_cm, heightCm: item.height_cm },
                itemBleedMm
              )
            : null

          return (
            <div key={f.id} style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {/* ── Ligne principale ── */}
              <div className="flex items-center gap-3 px-3 py-2.5">

                {/* N° visuel */}
                <span className="text-[10px] font-bold text-slate-400 w-4 flex-shrink-0 text-center">{idx + 1}</span>

                {/* Thumbnail */}
                {isUp ? (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#00AEEF' }} />
                  </div>
                ) : f.file_thumb ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                    <img src={f.file_thumb} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : isPDF && f.file_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                    <iframe src={f.file_url} title="PDF" className="absolute inset-0 pointer-events-none border-0"
                      style={{ width: 200, height: 200, transform: 'scale(0.2)', transformOrigin: '0 0' }} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 flex flex-col items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                )}

                {/* Nom + infos */}
                <div className="flex-1 min-w-0">
                  {isUp ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium" style={{ color: '#00AEEF' }}>
                        {uploadPhaseMap[f.id] === 'analyze' ? 'Analyse IA en cours…' : `Upload… ${uploadProgressMap[f.id] ?? 0}%`}
                      </p>
                      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className={`h-1.5 rounded-full transition-all duration-200 ${uploadPhaseMap[f.id] === 'analyze' ? 'bg-violet-500 w-full animate-pulse' : ''}`}
                          style={{
                            ...(uploadPhaseMap[f.id] !== 'analyze' ? { background: '#00AEEF' } : {}),
                            width: uploadPhaseMap[f.id] === 'upload' ? `${uploadProgressMap[f.id] ?? 0}%` : '100%',
                          }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium truncate leading-tight text-white">
                        {f.page_index && f.total_pages
                          ? <><span className="text-slate-400 font-normal">p.{f.page_index}/{f.total_pages} — </span>{f.file_name}</>
                          : f.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {/* Dimensions détectées + badge conformité */}
                        {f.file_info?.width_mm ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1 py-0.5 ${
                            dimStatus === 'ok'    ? 'text-emerald-400'
                            : dimStatus === 'bleed' ? 'text-emerald-400'
                            : dimStatus === 'error' ? 'text-red-400'
                            : 'text-slate-400'
                          }`} style={
                            dimStatus === 'ok' || dimStatus === 'bleed' ? { background: 'rgba(16,185,129,0.15)' }
                            : dimStatus === 'error' ? { background: 'rgba(239,68,68,0.15)' }
                            : undefined
                          }>
                            {dimStatus === 'ok'    && '✓ '}
                            {dimStatus === 'bleed' && '✓ '}
                            {dimStatus === 'error' && '⚠ '}
                            {Math.round((f.file_info.width_mm ?? 0) / 10)}×{Math.round((f.file_info.height_mm ?? 0) / 10)} cm
                            {dimStatus === 'error' && item.width_cm && (
                              <span className="font-normal ml-0.5">(attendu {item.width_cm}×{item.height_cm})</span>
                            )}
                          </span>
                        ) : null}
                        {f.file_url && !dimStatus && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${hasIssue ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {hasIssue ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {hasIssue ? (cs === 'RGB' ? 'RGB' : 'Vérifier') : 'OK'}
                          </span>
                        )}
                      </div>
                      {/* Analyse Claude CMYK */}
                      {slotAnalysis[f.id] && (() => {
                        const cmyk = slotAnalysis[f.id].checks?.find((c: any) => c.id === 'color_mode')
                        if (!cmyk) return null
                        return cmyk.status === 'error' ? (
                          <div className="flex items-center gap-1 rounded px-1.5 py-0.5 mt-1" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <span className="text-red-400 text-[10px] font-black">🚫 RGB</span>
                            <span className="text-[10px] text-red-400 font-semibold">NON CONFORME</span>
                          </div>
                        ) : cmyk.status === 'ok' ? (
                          <div className="flex items-center gap-1 rounded px-1.5 py-0.5 mt-1" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <span className="text-emerald-400 text-[10px] font-bold">✓ CMJN conforme</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded px-1.5 py-0.5 mt-1" style={{ background: 'rgba(245,196,0,0.15)', border: '1px solid rgba(245,196,0,0.25)' }}>
                            <span className="text-[10px] font-semibold" style={{ color: '#F5C400' }}>⚠ {cmyk.message}</span>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>

                {/* Compteur exemplaires */}
                {!isUp && f.file_url && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => updateCopies(f.id, f.copies - 1)}
                      disabled={f.copies <= minCopy}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors disabled:opacity-25 disabled:cursor-not-allowed" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>−</button>
                    <span className="w-7 text-center text-sm font-bold text-white">{f.copies}</span>
                    <button type="button" onClick={() => updateCopies(f.id, f.copies + 1)}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>+</button>
                    <span className="text-[10px] text-slate-400 ml-1">ex.</span>
                  </div>
                )}

                {/* Supprimer */}
                {!isUp && (
                  <button type="button" onClick={() => removeSlot(f.id)}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400 rounded-lg transition-colors flex-shrink-0" style={{ background: 'transparent' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* ── Alertes sous la ligne (dépliables) ── */}
              {!isUp && f.file_url && (hasIssue || (vr && !vr.dimensionMatch && !scAcc && vr.suggestedScale) || (scAcc && f.file_scale)) && (
                <div className="px-3 pb-2.5 space-y-1.5" style={{ background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.2)' }}>
                  {cs === 'RGB' && (
                    <p className="text-[11px] text-orange-600 font-semibold pt-2">⚠ RGB détecté — recommandé : CMYK pour impression optimale</p>
                  )}
                  {vr && !vr.dimensionMatch && !scAcc && vr.suggestedScale && (
                    <div className="pt-1.5">
                      <p className="text-[11px] text-orange-700 font-semibold mb-1.5">Dimensions différentes — mise à l'échelle ×{vr.suggestedScale} suggérée</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => acceptScale(f.id, vr.suggestedScale!)}
                          className="text-[11px] bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors">
                          Accepter ×{vr.suggestedScale}
                        </button>
                        <button type="button" onClick={() => skipScale(f.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-200 px-2 py-1 transition-colors">
                          Continuer quand même
                        </button>
                      </div>
                    </div>
                  )}
                  {scAcc && f.file_scale && (
                    <p className="text-[11px] text-orange-600 font-semibold pt-1.5">⚠ Mise à l'échelle ×{f.file_scale} sera appliquée à la production</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* ── Ligne "Ajouter un visuel" ── */}
        {remaining > 0 && !uploadingId && (
          <>
            <input
              ref={addInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.ai,.eps"
              onChange={e => { if (e.target.files?.[0]) { handleAddFile(e.target.files[0]); e.target.value = '' } }}
            />
            <button
              type="button"
              onClick={() => addInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
              style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-[10px] font-bold text-slate-500 w-4 text-center">{files.filter(f=>f.file_url).length + 1}</span>
              <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ border: '2px dashed rgba(0,174,239,0.4)' }}>
                <Upload className="w-4 h-4" style={{ color: '#00AEEF' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: '#00AEEF' }}>
                  {files.length === 0 ? 'Charger le premier visuel' : 'Ajouter un visuel'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {remaining} exemplaire{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''} à couvrir
                </p>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Dépassement */}
      {totalCopies > item.quantity && (
        <p className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Total ({totalCopies}) dépasse la quantité commandée ({item.quantity}) — ajustez les exemplaires ci-dessus
        </p>
      )}

      {/* Tout validé */}
      {allValid && (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          Tous les visuels sont validés — {totalCopies} exemplaires couverts
        </div>
      )}
    </div>
  )
}

// ─── Single-file zone (quantity = 1) ─────────────────────────────────────────

function SingleFileZone({ item, onValidated }: FileZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'analyze'>('upload')
  const [claudeAnalysis, setClaudeAnalysis] = useState<any>(null)
  const [scaleAccepted, setScaleAccepted] = useState(item.file_scale !== undefined && item.file_scale !== 1)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  // URL objet temporaire pour l'aperçu PDF (durée de vie = session)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null)
  const pdfObjectUrlRef = useRef<string | null>(null)

  // Nettoyer l'URL objet PDF à la destruction du composant
  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current) URL.revokeObjectURL(pdfObjectUrlRef.current)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setUploading(true)

    // Aperçu immédiat selon le type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (isPDF) {
      if (pdfObjectUrlRef.current) URL.revokeObjectURL(pdfObjectUrlRef.current)
      const objUrl = URL.createObjectURL(file)
      pdfObjectUrlRef.current = objUrl
      setPdfObjectUrl(objUrl)
    }

    try {
      // 1. Miniature image (pour images raster)
      const thumb = await generateImageThumb(file)

      // 2. Upload direct browser→R2 (pas de limite Vercel via URL pré-signée)
      setUploadPhase('upload')
      setUploadProgress(0)
      const presignRes = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', itemId: item.id }),
      })
      const presignData = await presignRes.json()
      if (!presignRes.ok || !presignData.presignedUrl) throw new Error(presignData.error || 'Erreur presign')
      const uploadData: { url: string; name: string } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)) }
        xhr.onload = () => { xhr.status === 200 ? resolve({ url: presignData.publicUrl, name: file.name }) : reject(new Error(`Upload R2 failed: ${xhr.status}`)) }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('PUT', presignData.presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })
      if (!uploadData.url) throw new Error('Erreur upload')
      setUploadProgress(100)

      // 3. Analyse IA Claude (CMYK en priorité) + validate en parallèle
      setUploadPhase('analyze')
      setUploadProgress(100)
      const dims = item.width_cm && item.height_cm ? `${item.width_cm} × ${item.height_cm} cm` : undefined
      const isPdf = file.name.toLowerCase().endsWith('.pdf')
      const isLargeFile = file.size > 10 * 1024 * 1024

      // Analyse PDF.js une seule passe : dimensions page 1 + preview JPEG + CMYK hint
      let pdfAnalysis: PdfAnalysis | null = null
      let cmykHint: 'cmyk' | 'rgb' | 'unknown' = 'unknown'
      let previewDataUrl: string | null = null
      if (isPdf) {
        pdfAnalysis = await analyzePdfClientSide(file, 1)  // page 1 suffit pour SingleFileZone
        cmykHint = pdfAnalysis.cmykHint
        previewDataUrl = pdfAnalysis.previewDataUrl
      }
      const analysisUrl = previewDataUrl ? await uploadPreviewToR2(previewDataUrl, presignData.key) : null

      // Dimensions extraites par PDF.js (valables même pour les gros fichiers)
      const pdfDims = pdfAnalysis?.pages[0] ?? null
      const bleedMm = (item as any).bleed_mm ?? (item.product as any)?.bleed_mm ?? 3

      const [valResult, claudeResult] = await Promise.allSettled([
        isLargeFile
          ? (() => {
              // Pour les gros fichiers : utiliser les dims PDF.js + vérifier vs commande
              const dimStatus = (pdfDims && item.width_cm && item.height_cm)
                ? checkDimensions(pdfDims, { widthCm: item.width_cm, heightCm: item.height_cm }, bleedMm)
                : null
              // Calcul du ratio de mise à l'échelle si les proportions correspondent
              const sugScale = (dimStatus === 'error' && pdfDims && item.width_cm && item.height_cm)
                ? computeSuggestedScale(pdfDims, { widthCm: item.width_cm, heightCm: item.height_cm })
                : null
              return Promise.resolve({
                ok: dimStatus !== 'error',
                dimensionMatch: dimStatus !== 'error',
                colorspace: cmykHint === 'cmyk' ? 'cmyk' : 'unknown',
                dimensions: { width_mm: pdfDims?.widthMm ?? 0, height_mm: pdfDims?.heightMm ?? 0 },
                pages: pdfAnalysis?.pageCount ?? 1,
                dpi: null, dpi_status: 'unknown' as const, width_px: 0, height_px: 0,
                warnings: dimStatus === 'error'
                  ? [`Format ${pdfDims?.widthMm ? Math.round(pdfDims.widthMm/10) : '?'}×${pdfDims?.heightMm ? Math.round(pdfDims.heightMm/10) : '?'} cm ≠ commandé ${item.width_cm}×${item.height_cm} cm`]
                  : [],
                suggestedScale: sugScale,
              })
            })()
          : (async () => {
              const fd2 = new FormData()
              fd2.append('file', file)
              if (item.width_cm) fd2.append('width_cm', String(item.width_cm))
              if (item.height_cm) fd2.append('height_cm', String(item.height_cm))
              const r = await fetch('/api/validate-file', { method: 'POST', body: fd2 })
              return r.json()
            })(),
        (async () => {
          const ctrl = new AbortController()
          setTimeout(() => ctrl.abort(), 60_000)
          const r = await fetch('/api/crm/analyze-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              file_url:      uploadData.url,
              analysis_url:  analysisUrl,
              cmyk_hint:     cmykHint,
              file_name:     file.name,
              dimensions:    dims,
              detected_dims: pdfDims ? `${(pdfDims.widthMm/10).toFixed(1)} × ${(pdfDims.heightMm/10).toFixed(1)} cm (PDF.js)` : undefined,
              product_bleed: (() => { const b = (item as any).bleed_mm ?? (item.product as any)?.bleed_mm ?? 3; return b > 0 ? `${b}mm de chaque côté` : undefined })(),
            }),
          })
          return r.json()
        })(),
      ])

      const valData: ValidationResult = valResult.status === 'fulfilled' ? valResult.value : {} as ValidationResult
      const analysis = claudeResult.status === 'fulfilled' && !claudeResult.value?.error ? claudeResult.value : null
      setClaudeAnalysis(analysis)
      setValidationResult(valData)
      setScaleAccepted(false)

      onValidated({
        file_url:       uploadData.url,
        file_name:      file.name,
        file_thumb:     thumb ?? undefined,
        file_validated: valData.dimensionMatch,
        file_analysis:  analysis ?? undefined,
        file_info: {
          width_mm:   valData.dimensions?.width_mm,
          height_mm:  valData.dimensions?.height_mm,
          colorspace: valData.colorspace,
          pages:      valData.pages,
          dpi:        valData.dpi,
        },
        file_scale: undefined,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [item.id, item.width_cm, item.height_cm, onValidated])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'application/postscript': ['.ai', '.eps'],
    },
    multiple: false,
    onDrop: (files) => { if (files[0]) handleFile(files[0]) },
  })

  const hasFile = !!item.file_url
  const valRes = validationResult
  const dimW = valRes?.dimensions.width_mm ?? item.file_info?.width_mm
  const dimH = valRes?.dimensions.height_mm ?? item.file_info?.height_mm
  const colorspace = valRes?.colorspace ?? item.file_info?.colorspace
  const dimensionMatch = valRes?.dimensionMatch ?? item.file_validated
  const suggestedScale = valRes?.suggestedScale
  const dpi = valRes?.dpi ?? item.file_info?.dpi
  const dpiStatus = valRes?.dpi_status ?? (dpi == null ? 'unknown' : dpi >= 150 ? 'ok' : dpi >= 72 ? 'warn' : 'error')

  const handleAcceptScale = () => {
    setScaleAccepted(true)
    onValidated({ file_scale: suggestedScale ?? undefined, file_validated: true })
  }

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValidationResult(null)
    setScaleAccepted(false)
    if (pdfObjectUrlRef.current) {
      URL.revokeObjectURL(pdfObjectUrlRef.current)
      pdfObjectUrlRef.current = null
    }
    setPdfObjectUrl(null)
    onValidated({ file_url: undefined, file_name: undefined, file_thumb: undefined, file_validated: false, file_info: undefined, file_scale: undefined })
  }

  // Miniature à afficher : base64 persistée (images) ou URL objet temporaire (PDF)
  const thumbSrc = item.file_thumb ?? null
  const isPDF = item.file_name?.toLowerCase().endsWith('.pdf') ?? false

  return (
    <div className="mt-3">
      {uploading ? (
        <div className="border-2 rounded-xl p-4 space-y-2.5" style={{ borderColor: 'rgba(0,174,239,0.3)', background: 'rgba(0,174,239,0.06)' }}>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#00AEEF' }} />
            <span className="text-sm font-medium" style={{ color: '#00AEEF' }}>
              {uploadPhase === 'upload' ? `Upload… ${uploadProgress}%` : 'Analyse IA en cours…'}
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className={`h-1.5 rounded-full transition-all duration-200 ${uploadPhase === 'analyze' ? 'bg-violet-500 w-full animate-pulse' : ''}`}
              style={{
                ...(uploadPhase !== 'analyze' ? { background: '#00AEEF' } : {}),
                width: uploadPhase === 'upload' ? `${uploadProgress}%` : '100%',
              }}
            />
          </div>
        </div>
      ) : hasFile ? (
        <div className="space-y-2">

          {/* ── Miniature du fichier ── */}
          <div className="flex items-center gap-3">
            {/* Aperçu image base64 */}
            {thumbSrc && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                <img src={thumbSrc} alt="Aperçu" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Aperçu PDF — blob en session ou URL Supabase persistée */}
            {!thumbSrc && isPDF && (pdfObjectUrl || item.file_url) && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                <iframe
                  src={pdfObjectUrl ?? item.file_url}
                  title="Aperçu PDF"
                  className="absolute inset-0 pointer-events-none border-0"
                  style={{ width: 320, height: 320, transform: 'scale(0.2)', transformOrigin: '0 0' }}
                />
              </div>
            )}
            {/* Icône générique pour AI/EPS ou PDF sans URL */}
            {!thumbSrc && !(isPDF && (pdfObjectUrl || item.file_url)) && (
              <div className="w-16 h-16 rounded-lg flex-shrink-0 flex flex-col items-center justify-center gap-1" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                <FileText className="w-6 h-6 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  {item.file_name?.split('.').pop()?.toUpperCase() ?? 'FILE'}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500 truncate">{item.file_name}</p>
          </div>

          {/* File status card */}
          {(() => {
            const hasIssue = (!dimensionMatch && !scaleAccepted) || colorspace === 'RGB' || dpiStatus === 'error'
            const hasWarn  = dpiStatus === 'warn'
            const cardStyle = hasIssue
              ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }
              : hasWarn
              ? { background: 'rgba(245,196,0,0.08)', border: '1px solid rgba(245,196,0,0.2)' }
              : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }
            return (
              <div className="rounded-xl p-3 flex items-start gap-3" style={cardStyle}>
                {hasIssue ? (
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                ) : hasWarn ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Ligne dimensions + colorspace + pages */}
                  {(dimW && dimH) || (colorspace && colorspace !== 'unknown') ? (
                    <p className="text-[11px] text-slate-400">
                      {dimW && dimH ? `${dimW}×${dimH} mm` : ''}
                      {colorspace && colorspace !== 'unknown' ? ` · ${colorspace}` : ''}
                      {valRes?.pages && valRes.pages > 1 ? ` · ${valRes.pages} pages` : ''}
                    </p>
                  ) : null}

                  {/* Badge DPI */}
                  {dpi != null && (
                    <p className={`text-[11px] font-semibold flex items-center gap-1 ${
                      dpiStatus === 'ok'    ? 'text-emerald-400'
                    : dpiStatus === 'warn'  ? ''
                    : dpiStatus === 'error' ? 'text-red-400'
                    : 'text-slate-400'}`} style={dpiStatus === 'warn' ? { color: '#F5C400' } : undefined}>
                      {dpiStatus === 'ok'    ? '✓' : '⚠'}
                      {dpi} DPI
                      {dpiStatus === 'ok'    ? ' — bonne résolution' : ''}
                      {dpiStatus === 'warn'  ? ' — acceptable grand format (> 1 m)' : ''}
                      {dpiStatus === 'error' ? ' — résolution trop faible !' : ''}
                    </p>
                  )}
                  {dpi == null && dpiStatus === 'unknown' && (
                    <p className="text-[11px] text-slate-400">Résolution DPI non détectée (fichier vectoriel — OK pour l'impression)</p>
                  )}

                  {/* Avertissement colorspace */}
                  {colorspace === 'RGB' && (
                    <p className="text-[11px] font-semibold" style={{ color: '#F5C400' }}>
                      ⚠ RGB détecté — recommandé : CMYK pour impression optimale
                    </p>
                  )}
                </div>
                <button onClick={handleRemoveFile} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })()}

          {/* Dimension mismatch — avec ou sans mise à l'échelle possible */}
          {!dimensionMatch && !scaleAccepted && dimW && dimH && (
            <div className="rounded-xl p-3" style={suggestedScale ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' } : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-xs font-bold mb-1" style={suggestedScale ? { color: '#F5C400' } : { color: '#f87171' }}>
                {suggestedScale ? '⚠ Format différent de la commande' : '⚠ Format fichier incompatible'}
              </p>
              <p className="text-[11px] text-slate-400 mb-2">
                Fichier : <strong>{Math.round((dimW as number)/10)}×{Math.round((dimH as number)/10)} cm</strong>
                {item.width_cm && item.height_cm && (
                  <> — Commande : <strong>{item.width_cm}×{item.height_cm} cm</strong></>
                )}
              </p>
              {suggestedScale ? (
                <>
                  <p className="text-[11px] mb-3" style={{ color: '#F5C400' }}>
                    Les proportions correspondent — mise à l'échelle ×{suggestedScale} possible
                    {suggestedScale < 1
                      ? ` (réduction au ${Math.round(suggestedScale * 100)}%)`
                      : suggestedScale > 1
                      ? ` (agrandissement ×${suggestedScale})`
                      : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptScale}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                    >
                      Oui, appliquer ×{suggestedScale} à la production
                    </button>
                    <button
                      onClick={() => { setScaleAccepted(true); onValidated({ file_validated: true }) }}
                      className="text-xs text-slate-500 hover:text-slate-200 px-2 py-1.5"
                    >
                      Continuer sans mise à l'échelle
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] mb-2" style={{ color: '#f87171' }}>
                    Les proportions ne correspondent pas — vérifiez le fichier ou contactez-nous.
                  </p>
                  <button
                    onClick={() => { setScaleAccepted(true); onValidated({ file_validated: true }) }}
                    className="text-[11px] text-slate-500 hover:text-slate-200 underline"
                  >
                    Continuer quand même (je confirme les dimensions)
                  </button>
                </>
              )}
            </div>
          )}
          {scaleAccepted && item.file_scale && (
            <p className="text-[11px] font-semibold px-1" style={{ color: '#F5C400' }}>
              ⚠ Mise à l'échelle ×{item.file_scale} sera appliquée à la production
            </p>
          )}

          {/* ── Analyse Claude (CMYK en priorité) ── */}
          {claudeAnalysis && (
            <div className="mt-2 space-y-1.5">
              {/* CMYK — critique en premier */}
              {(() => {
                const cmyk = claudeAnalysis.checks?.find((c: any) => c.id === 'color_mode')
                if (!cmyk) return null
                return cmyk.status === 'error' ? (
                  <div className="flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="flex-shrink-0 font-black text-sm" style={{ color: '#f87171' }}>🚫</span>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#f87171' }}>FICHIER RGB — NON CONFORME IMPRESSION</p>
                      <p className="text-[11px] text-red-400">{cmyk.message}</p>
                    </div>
                  </div>
                ) : cmyk.status === 'ok' ? (
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <span className="font-black text-sm text-emerald-400">✓</span>
                    <p className="text-xs font-bold text-emerald-400">CMJN — Mode couleur conforme</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(245,196,0,0.1)', border: '1px solid rgba(245,196,0,0.25)' }}>
                    <span className="text-sm" style={{ color: '#F5C400' }}>⚠</span>
                    <p className="text-xs font-semibold" style={{ color: '#F5C400' }}>{cmyk.message}</p>
                  </div>
                )
              })()}
              {/* Score global */}
              <div className="flex items-center justify-between text-xs font-bold px-2.5 py-1.5 rounded-lg"
                style={
                  claudeAnalysis.status === 'ok'
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                    : claudeAnalysis.status === 'warning'
                    ? { background: 'rgba(245,196,0,0.1)', color: '#F5C400' }
                    : { background: 'rgba(239,68,68,0.1)', color: '#f87171' }
                }>
                <span className="text-[11px] font-medium truncate max-w-[200px]">{claudeAnalysis.summary}</span>
                <span className="font-black ml-2 flex-shrink-0">{claudeAnalysis.score}/100</span>
              </div>
            </div>
          )}

          {/* Re-upload */}
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <button className="text-[11px] flex items-center gap-1 px-1 transition-colors" style={{ color: '#00AEEF' }}>
              <Upload className="w-3 h-3" /> Remplacer le fichier
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
          style={isDragActive
            ? { borderColor: '#00AEEF', background: 'rgba(0,174,239,0.08)' }
            : { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-300">
            {isDragActive ? 'Déposez ici…' : 'Déposez votre fichier ou cliquez'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">PDF, AI, EPS, JPG, PNG, TIFF · Max 500 MB</p>
        </div>
      )}
    </div>
  )
}

// ─── FileZone dispatcher ──────────────────────────────────────────────────────

function FileZone({ item, onValidated }: FileZoneProps) {
  return item.quantity > 1
    ? <MultiFileZone item={item} onValidated={onValidated} />
    : <SingleFileZone item={item} onValidated={onValidated} />
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasSigned, setHasSigned] = useState(false)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  // Ref stable pour éviter que le useEffect se relance à chaque re-render
  // (ce qui effacerait le canvas après chaque coup de crayon)
  const onSignRef = useRef(onSign)
  useEffect(() => { onSignRef.current = onSign }, [onSign])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // Fond blanc pour que la signature soit visible et s'exporte correctement dans le PDF
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const pos = getPos(e)
      lastPos.current = pos
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!drawing.current || !lastPos.current) return
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPos.current = pos
      setHasSigned(true)
      onSignRef.current(canvas.toDataURL())
    }

    const stop = () => {
      drawing.current = false
      lastPos.current = null
      if (canvasRef.current) onSignRef.current(canvasRef.current.toDataURL())
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stop)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stop)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // délibérément vide — le canvas n'est initialisé qu'une seule fois au montage

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
    onSign('')
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full touch-none cursor-crosshair"
          style={{ maxHeight: 140 }}
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
              <Pen className="w-4 h-4" /> Signez ici
            </p>
          </div>
        )}
      </div>
      <button
        onClick={handleClear}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Effacer la signature
      </button>
    </div>
  )
}

// ─── Adresse helpers (must be outside PanierClient to keep stable identity) ───

const COUNTRIES_LIST: [string, string][] = [
  ['BE', 'Belgique'], ['FR', 'France'], ['NL', 'Pays-Bas'], ['LU', 'Luxembourg'], ['DE', 'Allemagne'],
]

function AddrField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-0.5" style={{ color: '#00AEEF' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 text-white placeholder-slate-500"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
      />
    </div>
  )
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-0.5" style={{ color: '#00AEEF' }}>Pays</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 text-white"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        {COUNTRIES_LIST.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
      </select>
    </div>
  )
}

// ─── Helper: extract finition/delai/sides labels from a cart item ─────────────

function getFinitionLabels(item: CartItem): string[] {
  const labels: string[] = []
  const sf = (item as any).selectedFinitions as Record<string, string | string[]> | undefined
  const sd = (item as any).selectedDelai as { label?: string; days?: number } | null | undefined
  const ss = (item as any).selectedSides as Record<string, string[]> | undefined

  // Normalise les finitions DB (format plat {id,name} OU format structuré {id,options:[]})
  const rawFinitions = (item.product?.finitions ?? []) as any[]
  const finitionGroups: Array<{ id: string; label: string; options: Array<{ id: string; label: string }> }> =
    rawFinitions.length === 0 ? [] :
    rawFinitions[0]?.options !== undefined
      ? rawFinitions
      : rawFinitions.map((f: any) => ({
          id:      f.id ?? '',
          label:   f.name ?? f.label ?? '',
          options: [{ id: (f.id ?? '') + '_opt', label: f.name ?? f.label ?? '' }],
        }))

  if (sf) {
    for (const group of finitionGroups) {
      const sel = sf[group.id]
      if (!sel) continue
      const ids = Array.isArray(sel) ? sel : [sel]
      if (ids.length === 0) continue
      const optLabels = ids
        .map(id => (group.options ?? []).find(o => o.id === id)?.label)
        .filter(Boolean) as string[]
      if (optLabels.length) labels.push(`${group.label} : ${optLabels.join(', ')}`)
    }
  }

  if (sd?.label) labels.push(sd.label)

  if (ss && item.product?.sides_finitions) {
    const sidesConfig = item.product.sides_finitions as {
      sides: Array<{ id: string; label: string }>
      options: Array<{ id: string; label: string }>
    }
    for (const side of sidesConfig.sides ?? []) {
      const optIds = ss[side.id] ?? []
      const optLabels = optIds
        .map((id: string) => sidesConfig.options.find(o => o.id === id)?.label)
        .filter(Boolean) as string[]
      if (optLabels.length) labels.push(`${side.label} : ${optLabels.join(', ')}`)
    }
  }

  // Repli : si aucune finition structurée, utiliser le résumé texte (devis restaurés)
  if (labels.length === 0) {
    const fl = (item as any).finitions_label as string | undefined
    if (fl) return fl.split(' · ').filter(Boolean)
  }

  return labels
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PanierClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { items, removeItem, updateQuantity, updateItem, clearCart, total, orderReference, setOrderReference } = useCart()

  const [step, setStep] = useState<Step>(1)
  const [checkingOut, setCheckingOut] = useState(false)
  const [vatNumber, setVatNumber] = useState('')
  const [savingQuote, setSavingQuote] = useState(false)
  const [quoteSaved, setQuoteSaved] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [batDownloaded, setBatDownloaded] = useState(false)

  // ── Adresses ──
  const emptyAddr = () => ({ line1: '', line2: '', city: '', postal_code: '', country: 'BE' })
  const [billingName,          setBillingName]          = useState('')
  const [billingCompany,       setBillingCompany]       = useState('')
  const [billingAddr,          setBillingAddr]          = useState(emptyAddr())
  const [shippingAddr,         setShippingAddr]         = useState(emptyAddr())
  const [shipSameAsBill,       setShipSameAsBill]       = useState(true)
  const [shipInClientName,     setShipInClientName]     = useState(false)
  const [profileLoaded,        setProfileLoaded]        = useState(false)
  const [savedShippingAddrs,   setSavedShippingAddrs]   = useState<ShippingAddress[]>([])
  const [selectedShippingId,   setSelectedShippingId]   = useState<string | 'same' | 'new'>('same')
  const [editingBilling,       setEditingBilling]       = useState(false)
  const [clientAccounts,       setClientAccounts]       = useState<any[]>([])
  const [selectedAccountId,    setSelectedAccountId]    = useState<string | null>(null)

  // ── Payment & Delivery ──
  const [payDeliveryConfig, setPayDeliveryConfig] = useState<any>(null)
  const [deliveryMethod,    setDeliveryMethod]    = useState<'pickup' | 'parcel' | 'express'>('parcel')
  const [deliveryKm,        setDeliveryKm]        = useState(0)
  const [kmLoading,         setKmLoading]         = useState(false)
  const [kmError,           setKmError]           = useState<string | null>(null)
  const [paymentMethod,     setPaymentMethod]     = useState<'card' | 'alma' | 'wire'>('card')
  const [deliveryCost,      setDeliveryCost]      = useState(0)
  const [clientPaymentDeadline, setClientPaymentDeadline] = useState(0)

  // Helpers stables pour les champs d'adresse (ne pas les définir dans le render)
  const setB = useCallback(
    (k: keyof ReturnType<typeof emptyAddr>) => (v: string) =>
      setBillingAddr(a => ({ ...a, [k]: v })),
    []
  )
  const setS = useCallback(
    (k: keyof ReturnType<typeof emptyAddr>) => (v: string) =>
      setShippingAddr(a => ({ ...a, [k]: v })),
    []
  )

  // Charger le profil et les adresses de livraison au montage
  useEffect(() => {
    // Fetch global payment/delivery config (no auth required)
    fetch('/api/settings/payment-delivery')
      .then(r => r.json())
      .then(cfg => {
        setPayDeliveryConfig(cfg)
        // Set default payment method based on what's enabled globally
        if (cfg?.payment?.card)       setPaymentMethod('card')
        else if (cfg?.payment?.alma)  setPaymentMethod('alma')
        else if (cfg?.payment?.wire)  setPaymentMethod('wire')
        // Mode de livraison : priorité au param URL (restauration de devis), sinon config globale
        const urlDelivery = searchParams.get('delivery') as 'pickup' | 'parcel' | 'express' | null
        if (urlDelivery && ['pickup', 'parcel', 'express'].includes(urlDelivery)) {
          setDeliveryMethod(urlDelivery)
        } else if (cfg?.delivery?.parcel)        setDeliveryMethod('parcel')
        else if (cfg?.delivery?.pickup)  setDeliveryMethod('pickup')
        else if (cfg?.delivery?.express) setDeliveryMethod('express')
        setClientPaymentDeadline(cfg?.payment?.default_deadline_days ?? 0)
      })
      .catch(() => {})

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Profil
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (!data) return
        setBillingName(data.full_name ?? '')
        setBillingCompany(data.company ?? '')
        setVatNumber(data.vat_number ?? '')
        if (data.billing_line1) {
          setBillingAddr({
            line1:       data.billing_line1 ?? '',
            line2:       data.billing_line2 ?? '',
            city:        data.billing_city ?? '',
            postal_code: data.billing_postal_code ?? '',
            country:     data.billing_country ?? 'BE',
          })
        }
        setProfileLoaded(true)

        // Per-client overrides for payment/delivery
        if (data.payment_methods_override) {
          const pm: string[] = data.payment_methods_override
          if (pm.includes('card'))       setPaymentMethod('card')
          else if (pm.includes('alma'))  setPaymentMethod('alma')
          else if (pm.includes('wire'))  setPaymentMethod('wire')
        }
        if (data.payment_deadline_days != null) {
          setClientPaymentDeadline(data.payment_deadline_days)
        }
        if (data.delivery_methods_override) {
          const dm: string[] = data.delivery_methods_override
          if (dm.includes('parcel'))       setDeliveryMethod('parcel')
          else if (dm.includes('pickup'))  setDeliveryMethod('pickup')
          else if (dm.includes('express')) setDeliveryMethod('express')
        }
      })

      // Comptes entreprise
      fetch('/api/account/billing').then(r => r.ok ? r.json() : []).then((accounts: any[]) => {
        if (!accounts.length) return
        setClientAccounts(accounts)
        const active = accounts.find((a: any) => a.is_active) ?? accounts[0]
        setSelectedAccountId(active.id)
        setBillingCompany(active.name ?? '')
        setVatNumber(active.vat_number ?? '')
        if (active.address_line1) {
          setBillingAddr({
            line1:       active.address_line1 ?? '',
            line2:       active.address_line2 ?? '',
            city:        active.city          ?? '',
            postal_code: active.postal_code   ?? '',
            country:     active.country       ?? 'BE',
          })
        }
      })

      // Adresses de livraison sauvegardées
      supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (!data || data.length === 0) return
          setSavedShippingAddrs(data as ShippingAddress[])
          const defaultAddr = (data as ShippingAddress[]).find(a => a.is_default)
          if (defaultAddr) {
            setSelectedShippingId(defaultAddr.id)
            setShipSameAsBill(false)
          }
        })
    })
  }, [])

  const intraCommunity = isIntraCommunityVAT(vatNumber)

  const vatGroups = items.reduce<Record<number, { htva: number }>>((acc, item) => {
    const rate = intraCommunity ? 0 : ((item.product as any)?.vat_rate ?? 21)
    if (!acc[rate]) acc[rate] = { htva: 0 }
    acc[rate].htva += item.total_price
    return acc
  }, {})
  const totalHTVA = items.reduce((s, i) => s + i.total_price, 0)
  const totalVAT = Object.entries(vatGroups).reduce((s, [rate, g]) => s + calcVAT(g.htva, Number(rate)), 0)
  const totalTTC = totalHTVA + totalVAT

  // Recompute delivery cost (HTVA) whenever relevant state changes
  useEffect(() => {
    if (!payDeliveryConfig) return
    const country = shipSameAsBill ? billingAddr.country : shippingAddr.country
    const cost = calcDeliveryCost(
      deliveryMethod,
      totalHTVA,
      country,
      deliveryKm,
      payDeliveryConfig.delivery
    )
    setDeliveryCost(cost)
  }, [deliveryMethod, deliveryKm, totalHTVA, billingAddr.country, shippingAddr.country, shipSameAsBill, payDeliveryConfig])

  // TVA sur les frais de port : 21% (ou 0% si intracommunautaire)
  const deliveryVatRate = intraCommunity ? 0 : 21
  const deliveryVAT    = calcVAT(deliveryCost, deliveryVatRate)
  const deliveryCostTTC = deliveryCost + deliveryVAT

  const totalWithDelivery = totalTTC + deliveryCostTTC

  // ── Calcul automatique de la distance express ─────────────────────────────
  // Construit l'adresse de livraison complète
  const deliveryAddressForKm = useMemo(() => {
    let addr: typeof billingAddr
    if (savedShippingAddrs.length > 0 && selectedShippingId !== 'same' && selectedShippingId !== 'new') {
      const saved = savedShippingAddrs.find(a => a.id === selectedShippingId)
      addr = saved
        ? { line1: saved.line1, line2: saved.line2 ?? '', city: saved.city, postal_code: saved.postal_code ?? '', country: saved.country }
        : billingAddr
    } else if (selectedShippingId === 'new') {
      addr = shippingAddr
    } else {
      addr = billingAddr
    }
    if (!addr.line1 || !addr.city) return ''
    return `${addr.line1}, ${addr.postal_code} ${addr.city}, ${addr.country}`
  }, [billingAddr, shippingAddr, savedShippingAddrs, selectedShippingId])

  useEffect(() => {
    if (deliveryMethod !== 'express') return
    const atelierAddress = payDeliveryConfig?.delivery?.atelier_address
    if (!atelierAddress || !deliveryAddressForKm) return

    // Reset le km précédent pour afficher le spinner immédiatement
    setDeliveryKm(0)
    setKmError(null)

    const timer = setTimeout(async () => {
      setKmLoading(true)
      setKmError(null)
      try {
        const res = await fetch('/api/utils/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: atelierAddress, destination: deliveryAddressForKm }),
        })
        const data = await res.json()
        if (res.ok && typeof data.km === 'number') {
          setDeliveryKm(data.km)
        } else {
          setKmError(data.error ?? 'Calcul impossible')
        }
      } catch {
        setKmError('Calcul impossible')
      } finally {
        setKmLoading(false)
      }
    }, 800) // debounce 800ms

    return () => clearTimeout(timer)
  }, [deliveryMethod, deliveryAddressForKm, payDeliveryConfig])

  // ── Sauvegarde du profil + adresses au checkout ───────────────────────────
  // MUST be declared before the early return (hooks must not be conditional)
  const saveProfileBilling = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Profil de facturation
      await supabase.from('profiles').update({
        full_name:           billingName    || undefined,
        company:             billingCompany || undefined,
        billing_line1:       billingAddr.line1        || null,
        billing_line2:       billingAddr.line2        || null,
        billing_city:        billingAddr.city         || null,
        billing_postal_code: billingAddr.postal_code  || null,
        billing_country:     billingAddr.country      || 'BE',
        vat_number:          vatNumber                || null,
      }).eq('id', user.id)

      // 2. Nouvelle adresse de livraison → sauvegarde automatique
      if (selectedShippingId === 'new' && shippingAddr.line1 && shippingAddr.city) {
        const isFirst = savedShippingAddrs.length === 0
        await supabase.from('shipping_addresses').insert({
          user_id:     user.id,
          label:       'Livraison',
          line1:       shippingAddr.line1,
          line2:       shippingAddr.line2 || null,
          city:        shippingAddr.city,
          postal_code: shippingAddr.postal_code || null,
          country:     shippingAddr.country || 'BE',
          is_default:  isFirst,
        })
      }
    } catch { /* non-bloquant */ }
  }, [billingName, billingCompany, billingAddr, vatNumber, selectedShippingId, shippingAddr, savedShippingAddrs])

  // All items must have a file to proceed to step 2
  const allFilesUploaded = items.length > 0 && items.every(i => {
    // Produits sans visuel requis (accessoires, sans impression…)
    if (i.product?.requires_artwork === false) return true
    if (i.quantity > 1) {
      if (!i.files?.length) return false
      const tot = i.files.reduce((s, f) => s + f.copies, 0)
      return tot === i.quantity && i.files.every(f => f.file_validated)
    }
    return !!i.file_url
  })

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09111f' }}>
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-300 mb-2">Votre panier est vide</h1>
          <p className="text-slate-500 text-sm mb-6">Explorez notre catalogue pour trouver vos produits.</p>
          <Link href="/catalogue" className="text-white font-bold px-6 py-3 rounded-lg text-sm inline-flex items-center gap-2 transition-colors" style={{ background: '#00AEEF' }}>
            Voir le catalogue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // ── Convert to quote ──
  const handleConvertToQuote = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setQuoteError('Connectez-vous pour sauvegarder un devis')
      return
    }
    setSavingQuote(true)
    setQuoteError(null)
    try {
      // Résoudre l'adresse de livraison complète
      let resolvedShippingAddress = ''
      if (deliveryMethod === 'pickup') {
        resolvedShippingAddress = payDeliveryConfig?.delivery?.atelier_address ?? 'Enlèvement atelier'
      } else if (deliveryAddressForKm) {
        resolvedShippingAddress = deliveryAddressForKm
      }

      const res = await fetch('/api/cart-to-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          orderReference,
          vatNumber,
          deliveryMethod,
          deliveryCost,
          deliveryAddress: resolvedShippingAddress,
          deliveryCountry: deliveryMethod === 'pickup' ? 'BE' : (deliveryAddressForKm ? (billingAddr.country || 'BE') : 'BE'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      clearCart()
      router.push('/compte?tab=devis')
    } catch (err: any) {
      setQuoteError(err.message || 'Erreur lors de la sauvegarde du devis')
    } finally {
      setSavingQuote(false)
    }
  }

  // ── Garantir un selectedDelai sur chaque item avant envoi au checkout ──────
  // Si un item n'a pas de délai sélectionné, on prend le plus long délai standard du produit
  const itemsWithDelai = items.map(item => {
    const sd = (item as any).selectedDelai
    if (sd?.days) return item                         // déjà renseigné
    const delais: any[] = item.product?.delai_options ?? []
    if (!delais.length) return item                   // produit sans délai
    const standards = delais.filter((d: any) => !d.surcharge_percent || d.surcharge_percent === 0)
    const pool = standards.length > 0 ? standards : delais
    const defaultDelai = [...pool].sort((a: any, b: any) => b.days - a.days)[0]
    return { ...item, selectedDelai: defaultDelai } as any
  })

  // ── Stripe checkout ──
  const handleCheckout = async () => {
    setCheckingOut(true)
    await saveProfileBilling()
    try {
      const delivery = buildDelivery()
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsWithDelai,
          vatNumber,
          orderReference,
          billing: {
            name:    billingName,
            company: billingCompany,
            ...billingAddr,
          },
          shipping: {
            name: billingName,
            ...delivery,
          },
          delivery_method:    deliveryMethod,
          delivery_cost:      deliveryCost,
          ship_in_client_name: shipInClientName,
          total_for_alma:     totalWithDelivery,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingOut(false)
    }
  }

  // Helper to build delivery address
  const buildDelivery = () => {
    if (selectedShippingId === 'same') return billingAddr
    if (selectedShippingId === 'new')  return shippingAddr
    const saved = savedShippingAddrs.find(a => a.id === selectedShippingId)
    return saved
      ? { line1: saved.line1, line2: saved.line2 ?? '', city: saved.city, postal_code: saved.postal_code ?? '', country: saved.country }
      : billingAddr
  }

  // ── Alma checkout ──
  const handleAlmaCheckout = async () => {
    setCheckingOut(true)
    await saveProfileBilling()
    try {
      const delivery = buildDelivery()
      const res = await fetch('/api/alma/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsWithDelai,
          vatNumber,
          orderReference,
          billing:             { ...billingAddr, name: billingName, company: billingCompany },
          shipping:            { name: billingName, ...delivery },
          delivery_method:     deliveryMethod,
          delivery_cost:       deliveryCost,
          ship_in_client_name: shipInClientName,
          total_ttc:           totalWithDelivery,
        }),
      })
      const { url, error } = await res.json()
      if (url) {
        clearCart()
        window.location.href = url
      } else {
        alert(error || 'Erreur Alma')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingOut(false)
    }
  }

  // ── Wire checkout ──
  const handleWireCheckout = async () => {
    setCheckingOut(true)
    await saveProfileBilling()
    try {
      const delivery = buildDelivery()
      const res = await fetch('/api/orders/wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsWithDelai,
          vatNumber,
          orderReference,
          billing:             { ...billingAddr, name: billingName, company: billingCompany },
          shipping:            { name: billingName, ...delivery },
          delivery_method:     deliveryMethod,
          delivery_cost:       deliveryCost,
          ship_in_client_name: shipInClientName,
          total_ttc:           totalWithDelivery,
          total_ht:            totalHTVA + deliveryCost,
        }),
      })
      const { order_number, error } = await res.json()
      if (error) { alert(error); return }
      clearCart()
      router.push(`/commande/confirmation?type=wire&ref=${order_number}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingOut(false)
    }
  }

  // ── BAT PDF export ──
  const handleDownloadBAT = () => {
    const now = new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })
    const billingHtml = billingName ? `
      <div style="margin-bottom:4px;font-weight:700;font-size:13px;">${billingName}${billingCompany ? ` — ${billingCompany}` : ''}</div>
      ${billingAddr.line1 ? `<div>${billingAddr.line1}${billingAddr.line2 ? ', ' + billingAddr.line2 : ''}</div>` : ''}
      ${billingAddr.city ? `<div>${billingAddr.postal_code} ${billingAddr.city} · ${billingAddr.country}</div>` : ''}
      ${vatNumber ? `<div style="color:#64748b">TVA : ${vatNumber}</div>` : ''}
    ` : '<div style="color:#94a3b8;font-style:italic">Non renseignée</div>'
    const rowsHtml = items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.product?.name || 'Produit'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.width_cm && item.height_cm ? `${item.width_cm}×${item.height_cm} cm` : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(item.total_price)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>BAT — Comink</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; }
  h1 { font-size: 22px; font-weight: 900; color: #1e3a8a; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  th:last-child, td:last-child { text-align: right; }
  .totals td { font-weight: bold; padding: 6px 12px; }
  .totals .ttc { font-size: 16px; color: #1d4ed8; }
  .disclaimer { background: #fef9c3; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #713f12; margin-bottom: 24px; }
  .signature-section { margin-top: 32px; }
  .signature-box { border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
  .signature-box img { max-height: 120px; }
  .signature-label { font-size: 11px; color: #94a3b8; margin-top: 8px; }
  .parties { display:flex; gap:40px; margin-bottom:24px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; }
  .parties .col { flex:1; }
  .parties .col-right { text-align:right; }
  .parties h4 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; margin:0 0 6px; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<h1>Bon À Tirer — Comink</h1>
<p class="meta">Date : ${now}${orderReference ? ` · Réf : ${orderReference}` : ''}</p>

<div class="parties">
  <div class="col">
    <h4>Client / Facturation</h4>
    ${billingHtml}
  </div>
  <div class="col col-right">
    <h4>Imprimeur</h4>
    <div style="font-weight:700">Comink SRL</div>
    <div>Rue de Bruxelles 174h</div>
    <div>4340 Awans · Belgique</div>
    <div style="color:#64748b">info@comink.be · +32 4 233 01 38</div>
  </div>
</div>

<table>
  <thead><tr>
    <th>Produit</th><th style="text-align:center">Dimensions</th>
    <th style="text-align:center">Qté</th><th>Prix HTVA</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>

<table class="totals">
  <tr><td colspan="3">Sous-total marchandise HTVA</td><td>${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(totalHTVA)}</td></tr>
  ${Object.entries(vatGroups).sort(([a],[b]) => Number(a)-Number(b)).map(([rate, g]) =>
    `<tr><td colspan="3">TVA ${rate}%${intraCommunity && Number(rate)===0 ? ' (intracom.)' : ''}</td><td>${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(calcVAT(g.htva, Number(rate)))}</td></tr>`
  ).join('')}
  ${deliveryMethod !== 'pickup' && deliveryCost > 0 ? `
  <tr><td colspan="3">Livraison HTVA</td><td>${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(deliveryCost)}</td></tr>
  ${deliveryVAT > 0 ? `<tr><td colspan="3">TVA livraison ${deliveryVatRate}%</td><td>${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(deliveryVAT)}</td></tr>` : ''}
  ` : ''}
  <tr class="ttc"><td colspan="3">Total TTC</td><td>${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(totalWithDelivery)}</td></tr>
</table>

<div class="disclaimer">
  En validant ce Bon À Tirer, vous confirmez avoir vérifié les fichiers, dimensions, textes et contenu visuel.
  Comink ne peut être tenu responsable des erreurs ou omissions après validation du BAT.
</div>

<div class="signature-section">
  <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">Signature du client</h3>
  <div class="signature-box">
    ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" />` : '<p style="color:#cbd5e1;padding:40px 0;">—</p>'}
    <p class="signature-label">Signé électroniquement le ${now}</p>
  </div>
</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setBatDownloaded(true)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">
          Mon panier
        </h1>

        <StepIndicator current={step} />

        {/* ════ STEP 1 — Fichiers & références ════ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Global order reference */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#00AEEF' }}>
                Référence commande (optionnel)
              </label>
              <input
                type="text"
                value={orderReference}
                onChange={e => setOrderReference(e.target.value)}
                placeholder="Ex : COMM-2026-001, projet Salon, …"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 max-w-sm text-white placeholder-slate-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>

            {/* Cart items */}
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {/* Header : image + infos + prix */}
                  <div className="flex gap-4 items-start">
                    {item.product?.image_url && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <img src={item.product.image_url} alt={item.product?.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white">{item.product?.name || 'Produit'}</h3>
                      {(() => {
                        const sizes: any[] = item.product?.standard_sizes ?? []
                        // Si dimensions présentes → afficher avec label éventuel
                        if (item.width_cm && item.height_cm) {
                          const matched = sizes.find((s: any) =>
                            s.width_cm === item.width_cm && s.height_cm === item.height_cm
                          )
                          const label = matched?.name || matched?.label || null
                          return (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {label ? `${label} — ` : ''}{item.width_cm}×{item.height_cm} cm
                            </p>
                          )
                        }
                        // Fallback : déduire la taille depuis le prix unitaire (anciens items en cache)
                        if (sizes.length > 0) {
                          const byPrice = sizes.find((s: any) => Math.abs((s.price ?? 0) - item.unit_price) < 0.01)
                          if (byPrice) {
                            const label = byPrice.name || byPrice.label || null
                            return (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {label ? `${label} — ` : ''}{byPrice.width_cm}×{byPrice.height_cm} cm
                              </p>
                            )
                          }
                          // En dernier recours : afficher "Taille standard"
                          return <p className="text-xs text-slate-400 mt-0.5">Taille standard</p>
                        }
                        return null
                      })()}
                      {/* Finitions choisies */}
                      {(() => {
                        const labels = getFinitionLabels(item)
                        if (!labels.length) return null
                        return (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {labels.map((label, i) => (
                              <span key={i} className="inline-block text-[10px] font-semibold text-slate-300 rounded-full px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center rounded-lg overflow-hidden text-xs" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                          <button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="px-2.5 py-1.5 font-bold text-slate-300 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>−</button>
                          <span className="px-3 py-1.5 font-bold text-white" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2.5 py-1.5 font-bold text-slate-300 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>+</button>
                        </div>
                        <p className="text-sm font-bold ml-auto" style={{ color: '#00AEEF' }}>{formatPrice(item.total_price)} HTVA</p>
                      </div>
                    </div>
                  </div>

                  {/* Référence ligne */}
                  <div className="mt-3">
                    <input
                      type="text"
                      value={item.reference ?? ''}
                      onChange={e => updateItem(item.id, { reference: e.target.value })}
                      placeholder="Votre référence pour cette ligne (optionnel)"
                      className="w-full rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder-slate-600"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  {/* Zone upload — masquée si le produit ne nécessite pas de visuel */}
                  {item.product?.requires_artwork !== false ? (
                    <FileZone
                      item={item}
                      onValidated={(patch) => updateItem(item.id, patch)}
                    />
                  ) : (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-slate-400">Aucun visuel requis pour ce produit</p>
                    </div>
                  )}

                  {/* Bouton supprimer — en bas de la carte, bien visible */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer cette ligne
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quote feedback */}
            {quoteSaved && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 text-emerald-400" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle className="w-4 h-4" />
                Devis sauvegardé — consultez vos devis dans{' '}
                <Link href="/compte" className="underline font-bold">votre compte</Link>
              </div>
            )}
            {quoteError && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle className="w-4 h-4" />
                {quoteError}
                {quoteError.includes('Connectez') && (
                  <Link href="/auth/login" className="underline font-bold ml-1" style={{ color: '#00AEEF' }}>Se connecter</Link>
                )}
              </div>
            )}

            {/* ── Adresse de facturation ── */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#00AEEF' }}>1</span>
                Adresse de facturation
              </h3>

              {clientAccounts.length > 0 ? (
                <div className="space-y-3">
                  {/* Sélecteur si plusieurs comptes */}
                  {clientAccounts.length > 1 && (
                    <div className="space-y-2 mb-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Facturer sur le compte</p>
                      {clientAccounts.map((acc: any) => (
                        <button key={acc.id} type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.id)
                            setBillingCompany(acc.name ?? '')
                            setVatNumber(acc.vat_number ?? '')
                            if (acc.address_line1) setBillingAddr({
                              line1: acc.address_line1 ?? '', line2: acc.address_line2 ?? '',
                              city: acc.city ?? '', postal_code: acc.postal_code ?? '', country: acc.country ?? 'BE',
                            })
                          }}
                          className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all"
                          style={selectedAccountId === acc.id
                            ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)' }
                            : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: selectedAccountId === acc.id ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                            {selectedAccountId === acc.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00AEEF' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{acc.name}</p>
                            {acc.vat_number && <p className="text-[10px] text-slate-400">TVA {acc.vat_number}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Récap compte sélectionné */}
                  {(() => {
                    const acc = clientAccounts.find((a: any) => a.id === selectedAccountId)
                    if (!acc) return null
                    return (
                      <div className="rounded-lg px-4 py-3 space-y-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 text-sm">
                            <p className="font-bold text-white">{acc.name}</p>
                            {acc.vat_number && <p className="text-xs text-slate-400">TVA : {acc.vat_number}</p>}
                            {acc.address_line1 && (
                              <p className="text-xs text-slate-400">
                                {acc.address_line1}{acc.address_line2 ? `, ${acc.address_line2}` : ''} · {[acc.postal_code, acc.city].filter(Boolean).join(' ')}
                              </p>
                            )}
                            {!acc.address_line1 && (
                              <p className="text-xs text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Adresse manquante
                              </p>
                            )}
                          </div>
                          <Link href="/compte?tab=entreprise" className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Modifier →
                          </Link>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Nom du contact (toujours nécessaire) */}
                  <AddrField label="Nom / Prénom *" value={billingName} onChange={setBillingName} placeholder="Jean Dupont" />
                </div>
              ) : (
                /* Pas de compte entreprise → formulaire manuel */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <AddrField label="Nom / Prénom *" value={billingName} onChange={setBillingName} placeholder="Jean Dupont" />
                    <AddrField label="Société" value={billingCompany} onChange={setBillingCompany} placeholder="Comink SRL" />
                  </div>
                  <AddrField label="Adresse *" value={billingAddr.line1} onChange={setB('line1')} placeholder="Rue de Bruxelles 174h" />
                  <AddrField label="Complément" value={billingAddr.line2} onChange={setB('line2')} placeholder="Bte 3, 2e étage…" />
                  <div className="grid grid-cols-3 gap-3">
                    <AddrField label="Code postal *" value={billingAddr.postal_code} onChange={setB('postal_code')} placeholder="4340" />
                    <div className="col-span-2">
                      <AddrField label="Ville *" value={billingAddr.city} onChange={setB('city')} placeholder="Awans" />
                    </div>
                  </div>
                  <CountrySelect value={billingAddr.country} onChange={setB('country')} />
                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5" style={{ color: '#00AEEF' }}>N° TVA <span className="font-normal text-slate-500">(B2B — belge ou européen)</span></label>
                    <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="BE0123456789 ou FR12345678901"
                      className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 text-white placeholder-slate-500"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }} />
                    {isBelgianVAT(vatNumber) && (
                      <p className="mt-1 font-semibold flex items-center gap-1 text-[11px]" style={{ color: '#00AEEF' }}>
                        <CheckCircle className="w-3 h-3" /> Numéro TVA belge — TVA 21% applicable
                      </p>
                    )}
                    {intraCommunity && (
                      <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> TVA intracommunautaire — 0% appliqué
                      </p>
                    )}
                    {vatNumber && !isValidVAT(vatNumber) && (
                      <p className="text-[11px] mt-1 font-semibold flex items-center gap-1" style={{ color: '#F5C400' }}>
                        <AlertTriangle className="w-3 h-3" /> Format non reconnu (ex : BE0123456789 ou FR12345678901)
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Vous avez un compte entreprise ?{' '}
                    <Link href="/compte?tab=entreprise" className="underline" style={{ color: '#00AEEF' }}>
                      Gérer dans Mon compte →
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* ── Adresse de livraison ── */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#00AEEF' }}>2</span>
                Adresse de livraison
              </h3>

              {savedShippingAddrs.length > 0 ? (
                <div className="space-y-2">
                  {/* Card: identique à la facturation */}
                  <button
                    type="button"
                    onClick={() => setSelectedShippingId('same')}
                    className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                    style={selectedShippingId === 'same'
                      ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                      : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: selectedShippingId === 'same' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                      {selectedShippingId === 'same' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Identique à la facturation</p>
                      {billingAddr.line1 && <p className="text-xs text-slate-400">{billingAddr.line1}, {billingAddr.city}</p>}
                    </div>
                  </button>

                  {/* Cards: adresses sauvegardées */}
                  {savedShippingAddrs.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedShippingId(addr.id)}
                      className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                      style={selectedShippingId === addr.id
                        ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                        : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: selectedShippingId === addr.id ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                        {selectedShippingId === addr.id && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-300 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>{addr.label}</span>
                          {addr.is_default && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,174,239,0.15)', color: '#00AEEF' }}>Par défaut</span>}
                        </div>
                        <p className="text-sm font-semibold text-white">{addr.name}</p>
                        <p className="text-xs text-slate-400">{addr.line1}, {addr.postal_code} {addr.city} · {addr.country}</p>
                      </div>
                    </button>
                  ))}

                  {/* Card: nouvelle adresse */}
                  <button
                    type="button"
                    onClick={() => setSelectedShippingId('new')}
                    className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                    style={selectedShippingId === 'new'
                      ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                      : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: selectedShippingId === 'new' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                      {selectedShippingId === 'new' ? <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} /> : <span className="text-[10px] text-slate-500 font-bold">+</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-300">Nouvelle adresse</p>
                  </button>

                  {/* Formulaire nouvelle adresse inline */}
                  {selectedShippingId === 'new' && (
                    <div className="space-y-3 pt-1 pl-1">
                      <AddrField label="Adresse *" value={shippingAddr.line1} onChange={setS('line1')} placeholder="Rue de la Livraison 1" />
                      <AddrField label="Complément" value={shippingAddr.line2} onChange={setS('line2')} />
                      <div className="grid grid-cols-3 gap-3">
                        <AddrField label="Code postal *" value={shippingAddr.postal_code} onChange={setS('postal_code')} placeholder="4000" />
                        <div className="col-span-2">
                          <AddrField label="Ville *" value={shippingAddr.city} onChange={setS('city')} placeholder="Liège" />
                        </div>
                      </div>
                      <CountrySelect value={shippingAddr.country} onChange={setS('country')} />
                    </div>
                  )}
                </div>
              ) : (
                /* Pas d'adresses sauvegardées: checkbox + formulaire conditionnel */
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer mb-3">
                    <input type="checkbox" checked={shipSameAsBill} onChange={e => setShipSameAsBill(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#00AEEF]" />
                    Identique à l'adresse de facturation
                  </label>
                  {!shipSameAsBill && (
                    <div className="space-y-3">
                      <AddrField label="Adresse *" value={shippingAddr.line1} onChange={setS('line1')} placeholder="Rue de la Livraison 1" />
                      <AddrField label="Complément" value={shippingAddr.line2} onChange={setS('line2')} />
                      <div className="grid grid-cols-3 gap-3">
                        <AddrField label="Code postal *" value={shippingAddr.postal_code} onChange={setS('postal_code')} placeholder="4000" />
                        <div className="col-span-2">
                          <AddrField label="Ville *" value={shippingAddr.city} onChange={setS('city')} placeholder="Liège" />
                        </div>
                      </div>
                      <CountrySelect value={shippingAddr.country} onChange={setS('country')} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Mode de livraison ── */}
            {payDeliveryConfig && (
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#00AEEF' }}>3</span>
                  Mode de livraison
                </h3>
                <div className="space-y-2">
                  {/* Pickup */}
                  {payDeliveryConfig.delivery.pickup && (
                    <div role="button" tabIndex={0} onClick={() => setDeliveryMethod('pickup')} onKeyDown={e => e.key === 'Enter' && setDeliveryMethod('pickup')}
                      className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer"
                      style={deliveryMethod === 'pickup'
                        ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                        : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: deliveryMethod === 'pickup' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                        {deliveryMethod === 'pickup' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                      </div>
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Enlèvement atelier</p>
                        {payDeliveryConfig.delivery.atelier_address && (
                          <p className="text-xs text-slate-400">{payDeliveryConfig.delivery.atelier_address}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-emerald-400 flex-shrink-0">Gratuit</span>
                    </div>
                  )}

                  {/* Parcel */}
                  {payDeliveryConfig.delivery.parcel && (
                    <div role="button" tabIndex={0} onClick={() => setDeliveryMethod('parcel')} onKeyDown={e => e.key === 'Enter' && setDeliveryMethod('parcel')}
                      className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer"
                      style={deliveryMethod === 'parcel'
                        ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                        : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: deliveryMethod === 'parcel' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                        {deliveryMethod === 'parcel' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                      </div>
                      <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Livraison colis 48h</p>
                        <p className="text-xs text-slate-400">Belgique min {payDeliveryConfig.delivery.parcel_be_min}€ / Europe min {payDeliveryConfig.delivery.parcel_eu_min}€</p>
                      </div>
                      {deliveryMethod === 'parcel' && deliveryCost > 0 && (
                        <span className="text-sm font-bold flex-shrink-0 px-2 py-0.5 rounded-full" style={{ color: '#00AEEF', background: 'rgba(0,174,239,0.15)' }}>{formatPrice(deliveryCost)}</span>
                      )}
                    </div>
                  )}

                  {/* Express */}
                  {payDeliveryConfig.delivery.express && (
                    <div role="button" tabIndex={0} onClick={() => setDeliveryMethod('express')} onKeyDown={e => e.key === 'Enter' && setDeliveryMethod('express')}
                      className="w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all cursor-pointer"
                      style={deliveryMethod === 'express'
                        ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                        : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: deliveryMethod === 'express' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                        {deliveryMethod === 'express' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                      </div>
                      <Truck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Livraison express</p>
                        <p className="text-xs text-slate-400">{payDeliveryConfig.delivery.express_per_km}€/km · min {payDeliveryConfig.delivery.express_min}€</p>
                        {deliveryMethod === 'express' && (
                          <div className="mt-2 space-y-1.5" onClick={e => e.stopPropagation()}>
                            {kmLoading ? (
                              <div className="flex items-center gap-2 text-xs" style={{ color: '#00AEEF' }}>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Calcul de la distance…
                              </div>
                            ) : kmError ? (
                              <div className="space-y-1">
                                <p className="text-xs flex items-center gap-1" style={{ color: '#F5C400' }}>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {kmError} — saisie manuelle :
                                </p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number" min="0"
                                    value={deliveryKm || ''}
                                    onChange={e => setDeliveryKm(Number(e.target.value))}
                                    placeholder="km"
                                    className="w-20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 text-white"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                                  />
                                  <span className="text-xs text-slate-400">km (aller)</span>
                                </div>
                              </div>
                            ) : deliveryKm > 0 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-300 font-semibold">
                                  {deliveryKm} km (calculé automatiquement)
                                </span>
                                <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: '#00AEEF', background: 'rgba(0,174,239,0.15)' }}>
                                  {formatPrice(deliveryCost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setDeliveryKm(0); setKmError(null) }}
                                  className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                                >
                                  Recalculer
                                </button>
                              </div>
                            ) : !payDeliveryConfig?.delivery?.atelier_address ? (
                              <p className="text-xs flex items-center gap-1" style={{ color: '#F5C400' }}>
                                <AlertTriangle className="w-3 h-3" />
                                Adresse atelier non configurée dans l'admin
                              </p>
                            ) : !deliveryAddressForKm ? (
                              <p className="text-xs text-slate-500 italic">
                                Renseignez votre adresse de livraison pour calculer la distance
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Calcul en cours…
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Expédition en son nom ── */}
                {deliveryMethod !== 'pickup' && (
                  <label className="flex items-start gap-3 mt-4 cursor-pointer select-none group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={shipInClientName}
                        onChange={e => setShipInClientName(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors`}
                        style={shipInClientName
                          ? { background: '#00AEEF', borderColor: '#00AEEF' }
                          : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.3)' }}>
                        {shipInClientName && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Expédier en mon nom / au nom de ma société</p>
                      <p className="text-xs text-slate-400 mt-0.5">Le colis sera expédié sous votre nom ou celui de votre société (expédition aveugle — le nom Comink n'apparaîtra pas).</p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleConvertToQuote}
                disabled={savingQuote}
                className="w-full sm:w-auto font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ border: '1px solid #00AEEF', color: '#00AEEF', background: 'transparent' }}
              >
                {savingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Convertir en devis
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!allFilesUploaded}
                className="w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                style={{ background: '#00AEEF' }}
              >
                Continuer
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {!allFilesUploaded && (
              <p className="text-xs text-center text-slate-400">
                Veuillez ajouter un fichier pour chaque article avant de continuer
              </p>
            )}
          </div>
        )}

        {/* ════ STEP 2 — BAT ════ */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* BAT preview */}
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: '#00AEEF' }} />
                  Bon À Tirer — Comink
                </h2>
                <div className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              {orderReference && (
                <p className="text-xs text-slate-400 mb-3">Référence : <span className="font-semibold text-slate-200">{orderReference}</span></p>
              )}

              {/* Adresse de facturation */}
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Client / Facturation</p>
                      {billingName && !editingBilling && (
                        <button
                          type="button"
                          onClick={() => setEditingBilling(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all text-white"
                          style={{ color: '#00AEEF', background: 'rgba(0,174,239,0.1)', border: '1px solid rgba(0,174,239,0.3)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-.707.414l-3 1a1 1 0 01-1.293-1.293l1-3a2 2 0 01.414-.707z" /></svg>
                          Modifier adresse
                        </button>
                      )}
                    </div>

                    {/* Edit form */}
                    {(!billingName || editingBilling) ? (
                      <div className="space-y-2 mt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <AddrField label="Nom / Prénom *" value={billingName} onChange={setBillingName} placeholder="Jean Dupont" />
                          <AddrField label="Société" value={billingCompany} onChange={setBillingCompany} placeholder="Ma Société SRL" />
                        </div>
                        <AddrField label="Adresse *" value={billingAddr.line1} onChange={setB('line1')} placeholder="Rue de Bruxelles 174h" />
                        <AddrField label="Complément" value={billingAddr.line2} onChange={setB('line2')} placeholder="Bte 3…" />
                        <div className="grid grid-cols-3 gap-2">
                          <AddrField label="Code postal *" value={billingAddr.postal_code} onChange={setB('postal_code')} placeholder="4340" />
                          <div className="col-span-2">
                            <AddrField label="Ville *" value={billingAddr.city} onChange={setB('city')} placeholder="Awans" />
                          </div>
                        </div>
                        <CountrySelect value={billingAddr.country} onChange={setB('country')} />
                        {billingName && editingBilling && (
                          <button
                            type="button"
                            onClick={() => setEditingBilling(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors mt-1"
                          style={{ background: '#00AEEF' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Valider l'adresse
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 space-y-0.5">
                        <p className="font-semibold text-white">{billingName}{billingCompany ? ` — ${billingCompany}` : ''}</p>
                        {billingAddr.line1 && <p>{billingAddr.line1}{billingAddr.line2 ? `, ${billingAddr.line2}` : ''}</p>}
                        {billingAddr.city && <p>{billingAddr.postal_code} {billingAddr.city} · {billingAddr.country}</p>}
                        {vatNumber && <p className="text-slate-400">TVA : {vatNumber}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Imprimeur</p>
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <p className="font-semibold text-white">Comink SRL</p>
                      <p>Rue de Bruxelles 174h</p>
                      <p>4340 Awans · Belgique</p>
                      <p className="text-slate-400">info@comink.be</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items — visuels + rapport contrôle */}
              <div className="space-y-4 mb-4">
                {items.map(item => {
                  // Collecter tous les fichiers de cette ligne
                  const allFiles: Array<{ file: any; isSingle: boolean }> =
                    item.files?.length
                      ? item.files.filter(f => f.file_url).map(f => ({ file: f, isSingle: false }))
                      : item.file_url
                        ? [{ file: item, isSingle: true }]
                        : []

                  return (
                    <div key={item.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* En-tête ligne produit */}
                      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div>
                          <span className="text-xs font-bold text-white">{item.product?.name || 'Produit'}</span>
                          {item.width_cm && item.height_cm && (
                            <span className="ml-2 text-[10px] text-slate-400">{item.width_cm}×{item.height_cm} cm</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-300">{item.quantity} ex.</span>
                          <span className="ml-3 text-xs font-bold" style={{ color: '#00AEEF' }}>{formatPrice(item.total_price)}</span>
                        </div>
                      </div>

                      {/* Visuels */}
                      {allFiles.length > 0 ? (
                        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                          {allFiles.map(({ file, isSingle }, fi) => {
                            const a = (file as any).file_analysis
                            const cmykCheck  = a?.checks?.find((c: any) => c.id === 'color_mode')
                            const dimCheck   = a?.checks?.find((c: any) => c.id === 'dimensions')
                            const resCheck   = a?.checks?.find((c: any) => c.id === 'resolution')
                            const bleedCheck = a?.checks?.find((c: any) => c.id === 'bleed')
                            const score      = a?.score

                            return (
                              <div key={(file as any).id ?? fi} className="flex items-start gap-3 px-3 py-2.5">
                                {/* Miniature */}
                                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
                                  {(file as any).file_thumb
                                    ? <img src={(file as any).file_thumb} alt="" className="w-full h-full object-cover" />
                                    : <FileText className="w-5 h-5 text-slate-300" />
                                  }
                                </div>

                                {/* Infos fichier */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-slate-200 truncate">
                                    {(file as any).page_index && (file as any).total_pages
                                      ? <><span className="text-slate-400 font-normal">p.{(file as any).page_index}/{(file as any).total_pages} — </span>{(file as any).file_name}</>
                                      : (file as any).file_name || '—'}
                                  </p>

                                  {/* Dimensions détectées */}
                                  {(file as any).file_info?.width_mm > 0 && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {Math.round((file as any).file_info.width_mm / 10)}×{Math.round((file as any).file_info.height_mm / 10)} cm
                                    </p>
                                  )}

                                  {/* Badges rapport IA */}
                                  {a && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {cmykCheck && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={cmykCheck.status === 'ok' ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' } : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                          {cmykCheck.status === 'ok' ? '✓ CMJN' : '✗ RGB'}
                                        </span>
                                      )}
                                      {dimCheck && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={dimCheck.status === 'ok' ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' } : dimCheck.status === 'warning' ? { background: 'rgba(245,196,0,0.15)', color: '#F5C400' } : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                          {dimCheck.status === 'ok' ? '✓ Format' : `⚠ ${dimCheck.message?.slice(0, 30)}`}
                                        </span>
                                      )}
                                      {resCheck && resCheck.status !== 'ok' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,196,0,0.15)', color: '#F5C400' }}>
                                          ⚠ Résolution
                                        </span>
                                      )}
                                      {bleedCheck && bleedCheck.status === 'error' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                          ✗ Fonds perdus
                                        </span>
                                      )}
                                      {score != null && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto" style={score >= 80 ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' } : score >= 60 ? { background: 'rgba(245,196,0,0.15)', color: '#F5C400' } : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                          {score}/100
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {!a && (file as any).file_url && (
                                    <p className="text-[10px] text-slate-500 italic mt-1">Analyse non disponible</p>
                                  )}
                                </div>

                                {/* Copies */}
                                <div className="flex-shrink-0 text-right">
                                  <span className="text-xs font-bold text-slate-300">{(file as any).copies ?? item.quantity} ex.</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-slate-500 italic">Aucun fichier déposé</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm pt-3 mb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between text-slate-400">
                  <span>Sous-total marchandise HTVA</span><span>{formatPrice(totalHTVA)}</span>
                </div>
                {Object.entries(vatGroups).sort(([a],[b]) => Number(a)-Number(b)).map(([rate, g]) => (
                  <div key={rate} className="flex justify-between text-slate-400">
                    <span>TVA {rate}%{intraCommunity && Number(rate)===0 ? ' (intracom.)' : ''}</span>
                    <span>{formatPrice(calcVAT(g.htva, Number(rate)))}</span>
                  </div>
                ))}
                {deliveryMethod !== 'pickup' && deliveryCost > 0 && (<>
                  <div className="flex justify-between text-slate-400">
                    <span>Livraison HTVA</span><span>{formatPrice(deliveryCost)}</span>
                  </div>
                  {deliveryVAT > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>TVA livraison {deliveryVatRate}%</span><span>{formatPrice(deliveryVAT)}</span>
                    </div>
                  )}
                </>)}
                <div className="flex justify-between font-extrabold text-white text-base pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span>Total TTC</span><span style={{ color: '#00AEEF' }}>{formatPrice(totalWithDelivery)}</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl p-3 text-xs mb-6" style={{ background: 'rgba(245,196,0,0.08)', border: '1px solid rgba(245,196,0,0.2)', color: '#F5C400' }}>
                En signant ce BAT, vous confirmez avoir vérifié les fichiers, dimensions et contenu.
                Comink ne peut être tenu responsable des erreurs après validation.
              </div>

              {/* Signature */}
              <div>
                <p className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Pen className="w-4 h-4" style={{ color: '#00AEEF' }} /> Signez ici
                </p>
                <SignatureCanvas onSign={(url) => setSignatureDataUrl(url)} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-full sm:w-auto font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors text-slate-300"
                style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'transparent' }}
              >
                ← Retour
              </button>
              <button
                onClick={handleDownloadBAT}
                className="w-full sm:flex-1 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                style={{ border: '1px solid #00AEEF', color: '#00AEEF', background: 'transparent' }}
              >
                <FileText className="w-4 h-4" /> Télécharger le BAT (PDF)
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!signatureDataUrl || !billingName || !billingAddr.line1 || !billingAddr.city}
                className="w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                style={{ background: '#00AEEF' }}
              >
                Valider et passer au paiement
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {(!signatureDataUrl || !billingName || !billingAddr.line1 || !billingAddr.city) && (
              <p className="text-xs text-center text-slate-400">
                {!billingName || !billingAddr.line1 || !billingAddr.city
                  ? 'Veuillez remplir votre adresse de facturation et signer le BAT avant de continuer'
                  : 'Veuillez signer le BAT avant de continuer'
                }
              </p>
            )}
          </div>
        )}

        {/* ════ STEP 3 — Paiement ════ */}
        {step === 3 && (
            <div className="max-w-lg mx-auto space-y-5">

              {/* ── Résumé facturation (saisie à l'étape 1) ── */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">✓</span>
                    Facturation
                  </h3>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs font-semibold hover:underline" style={{ color: '#00AEEF' }}>
                    Modifier
                  </button>
                </div>
                <div className="text-xs text-slate-400 space-y-0.5">
                  {billingName
                    ? <>
                        <p className="font-semibold text-white">{billingName}{billingCompany ? ` — ${billingCompany}` : ''}</p>
                        {billingAddr.line1 && <p>{billingAddr.line1}{billingAddr.line2 ? `, ${billingAddr.line2}` : ''}</p>}
                        {billingAddr.city && <p>{billingAddr.postal_code} {billingAddr.city} · {billingAddr.country}</p>}
                        {vatNumber && <p className="text-slate-500">TVA : {vatNumber}</p>}
                      </>
                    : <p className="text-slate-500 italic">Non renseignée — <button type="button" onClick={() => setStep(1)} className="underline" style={{ color: '#00AEEF' }}>compléter à l'étape 1</button></p>
                  }
                </div>
              </div>

              {/* ── Résumé livraison (choisi à l'étape 1) ── */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">✓</span>
                    Livraison
                  </h3>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs font-semibold hover:underline" style={{ color: '#00AEEF' }}>
                    Modifier
                  </button>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {deliveryMethod === 'pickup' && (
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /><span className="font-semibold text-white">Enlèvement atelier</span>{payDeliveryConfig?.delivery?.atelier_address && <span className="text-slate-400">· {payDeliveryConfig.delivery.atelier_address}</span>}</p>
                  )}
                  {deliveryMethod === 'parcel' && (
                    <p className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /><span className="font-semibold text-white">Livraison colis 48h</span>{deliveryCost > 0 && <span className="font-bold" style={{ color: '#00AEEF' }}>· {formatPrice(deliveryCost)} HTVA</span>}</p>
                  )}
                  {deliveryMethod === 'express' && (
                    <p className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /><span className="font-semibold text-white">Livraison express</span>{deliveryCost > 0 && <span className="font-bold" style={{ color: '#00AEEF' }}>· {formatPrice(deliveryCost)} HTVA</span>}</p>
                  )}
                  {deliveryMethod !== 'pickup' && (() => {
                    if (selectedShippingId === 'same') return billingAddr.line1 ? <p className="text-slate-500 pl-5">{billingAddr.line1}, {billingAddr.postal_code} {billingAddr.city}</p> : null
                    if (selectedShippingId === 'new') return shippingAddr.line1 ? <p className="text-slate-500 pl-5">{shippingAddr.line1}, {shippingAddr.postal_code} {shippingAddr.city}</p> : null
                    const saved = savedShippingAddrs.find(a => a.id === selectedShippingId)
                    return saved ? <p className="text-slate-500 pl-5">{saved.line1}, {saved.postal_code} {saved.city}</p> : null
                  })()}
                  {shipInClientName && <p className="pl-5 font-semibold" style={{ color: '#F5C400' }}>Expédition en votre nom</p>}
                </div>
              </div>

              {/* ── Mode de paiement ── */}
              {payDeliveryConfig && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#00AEEF' }}>2</span>
                    Mode de paiement
                  </h3>

                  {clientPaymentDeadline > 0 && (
                    <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)', color: '#00AEEF' }}>
                      Vous bénéficiez d&apos;un délai de paiement de <strong>{clientPaymentDeadline} jours</strong>. Votre commande sera traitée immédiatement.
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Carte bancaire */}
                    {payDeliveryConfig.payment.card && (
                      <button type="button" onClick={() => setPaymentMethod('card')}
                        className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                        style={paymentMethod === 'card'
                          ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                          : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: paymentMethod === 'card' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                          {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                        </div>
                        <CreditCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Carte bancaire</p>
                          <p className="text-xs text-slate-400">Visa / Mastercard · Paiement sécurisé Stripe</p>
                        </div>
                      </button>
                    )}

                    {/* Alma 3× */}
                    {payDeliveryConfig.payment.alma && (
                      <button type="button" onClick={() => setPaymentMethod('alma')}
                        className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                        style={paymentMethod === 'alma'
                          ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                          : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: paymentMethod === 'alma' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                          {paymentMethod === 'alma' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                        </div>
                        <CreditCard className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Alma 3×</p>
                          <p className="text-xs text-slate-400">Payez en 3 fois sans frais · {formatPrice(totalWithDelivery / 3)}/mois</p>
                        </div>
                      </button>
                    )}

                    {/* Virement bancaire */}
                    {payDeliveryConfig.payment.wire && (
                      <button type="button" onClick={() => setPaymentMethod('wire')}
                        className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all"
                        style={paymentMethod === 'wire'
                          ? { border: '1px solid #00AEEF', background: 'rgba(0,174,239,0.08)', boxShadow: '0 0 0 1px rgba(0,174,239,0.3)' }
                          : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: paymentMethod === 'wire' ? '#00AEEF' : 'rgba(255,255,255,0.3)' }}>
                          {paymentMethod === 'wire' && <div className="w-2 h-2 rounded-full" style={{ background: '#00AEEF' }} />}
                        </div>
                        <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Virement bancaire</p>
                          {clientPaymentDeadline > 0
                            ? <p className="text-xs text-slate-400">Délai : {clientPaymentDeadline} jours</p>
                            : <p className="text-xs text-slate-400">Paiement par virement</p>
                          }
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Récapitulatif commande ── */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#00AEEF' }}>3</span>
                  Récapitulatif
                </h3>
                <div className="space-y-1.5 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400 truncate mr-4">{item.product?.name || 'Produit'} ×{item.quantity}</span>
                      <span className="font-semibold text-white flex-shrink-0">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 space-y-1 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between text-slate-400"><span>Sous-total marchandise HTVA</span><span>{formatPrice(totalHTVA)}</span></div>
                  {Object.entries(vatGroups).sort(([a],[b]) => Number(a)-Number(b)).map(([rate, g]) => (
                    <div key={rate} className="flex justify-between text-slate-400">
                      <span>TVA {rate}%{intraCommunity && Number(rate)===0 ? ' (intracommunautaire)' : ''}</span>
                      <span>{formatPrice(calcVAT(g.htva, Number(rate)))}</span>
                    </div>
                  ))}
                  {deliveryMethod !== 'pickup' && deliveryCost > 0 && (<>
                    <div className="flex justify-between text-slate-400">
                      <span>Livraison HTVA ({deliveryMethod === 'parcel' ? 'Colis 48h' : 'Express'})</span>
                      <span>{formatPrice(deliveryCost)}</span>
                    </div>
                    {deliveryVAT > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>TVA livraison {deliveryVatRate}%</span>
                        <span>{formatPrice(deliveryVAT)}</span>
                      </div>
                    )}
                  </>)}
                  <div className="flex justify-between font-extrabold text-white pt-2 text-base" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span>Total TTC</span>
                    <span style={{ color: '#00AEEF' }}>{formatPrice(totalWithDelivery)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => setStep(2)} className="w-full font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors text-slate-300"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'transparent' }}>
                  ← Retour
                </button>
                <button
                  onClick={() => {
                    if (paymentMethod === 'card')       handleCheckout()
                    else if (paymentMethod === 'alma')  handleAlmaCheckout()
                    else                                handleWireCheckout()
                  }}
                  disabled={checkingOut || !billingAddr.line1 || !billingAddr.city || !billingName}
                  className="w-full disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  style={{ background: '#00AEEF' }}>
                  {checkingOut
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirection…</>
                    : paymentMethod === 'wire'
                    ? <><CheckCircle className="w-4 h-4" /> Confirmer la commande</>
                    : paymentMethod === 'alma'
                    ? <><CreditCard className="w-4 h-4" /> Payer en 3× avec Alma</>
                    : <><CheckCircle className="w-4 h-4" /> Payer maintenant</>
                  }
                </button>
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle className="w-3 h-3 text-emerald-400" /> Paiement sécurisé</p>
                <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle className="w-3 h-3 text-emerald-400" /> Production locale à Liège</p>
              </div>
            </div>
        )}
      </div>
    </div>
  )
}
