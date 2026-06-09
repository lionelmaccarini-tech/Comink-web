'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ShoppingCart, Upload, FileText, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import LottiePlayer from '@/components/ui/LottiePlayer'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { formatPrice, calculatePricePerM2 } from '@/lib/utils'

// ── Belgian holidays + working days ──────────────────────────────────────────

function getBelgianHolidays(year: number): Set<string> {
  const fmt = (m: number, d: number) => `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const fixed = [fmt(1,1),fmt(5,1),fmt(7,21),fmt(8,15),fmt(11,1),fmt(11,11),fmt(12,25)]
  const easterDates: Record<number,[number,number]> = { 2025:[4,20], 2026:[4,5], 2027:[3,28] }
  const e = easterDates[year]
  if (e) {
    const easter = new Date(year, e[0]-1, e[1])
    const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r }
    const fmtD = (d: Date) => d.toISOString().slice(0,10)
    fixed.push(fmtD(add(easter,1)), fmtD(add(easter,39)), fmtD(add(easter,49)))
  }
  return new Set(fixed)
}

function addWorkingDays(days: number): Date {
  const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()+1)
  let added = 0
  while (added < days) {
    const dow = date.getDay()
    const str = date.toISOString().slice(0,10)
    if (dow !== 0 && dow !== 6 && !getBelgianHolidays(date.getFullYear()).has(str)) added++
    if (added < days) date.setDate(date.getDate()+1)
  }
  return date
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinitionOption { id: string; label: string; price_type: 'fixed'|'percent'|'per_m2'; price_supplement: number; default_selected: boolean }
interface FinitionGroup  { id: string; label: string; display_type: 'checkbox'|'select'; required: boolean; options: FinitionOption[] }

function normalizeFinitions(raw: any[]): FinitionGroup[] {
  if (!raw?.length) return []
  if (raw[0]?.options !== undefined) return raw as FinitionGroup[]
  return raw.map((f: any) => ({
    id: f.id ?? Math.random().toString(36).slice(2),
    label: f.name ?? '',
    display_type: (f.display_type === 'select' ? 'select' : 'checkbox') as 'checkbox'|'select',
    required: false,
    options: [{ id: (f.id ?? '') + '_opt', label: f.name ?? '', price_type: f.price_type ?? 'fixed', price_supplement: f.price_supplement ?? 0, default_selected: f.default_selected ?? false }],
  }))
}

interface ProductInfo {
  id: string
  name: string
  category: string
  product_type: 'sur_mesure' | 'taille_standard'
  price_per_m2?: number
  standard_sizes?: Array<{ label: string; width_cm: number; height_cm: number; price: number }>
  finitions?: any[]
  delai_options?: any[]
  sides_finitions?: any
  available: boolean
}

interface FileAnalysis {
  score: number
  status: 'ok' | 'warning' | 'error'
  summary: string
  checks: Array<{ id: string; label: string; status: 'ok' | 'warning' | 'error'; message: string; detail?: string }>
  recommendations?: string[]
}

interface ProductRow {
  id: string
  product_id: string
  width_cm: number | ''
  height_cm: number | ''
  quantity: number
  expanded: boolean
  selectedFinitions: Record<string, string | string[]>
  selectedDelai: any
  selectedSides: Record<string, string[]>

  // Fichier
  fileObj?: File
  fileUrl?: string
  fileName?: string

  // État upload+analyse
  uploadProgress: number
  fileState: 'none' | 'uploading' | 'analyzing' | 'done' | 'error'

  // Résultat analyse
  analysis?: FileAnalysis

  // BAT
  batNote: string
  forceValidate: boolean
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

async function parsePdfPageSizes(file: File): Promise<Array<{ widthCm: number; heightCm: number }>> {
  const buffer = await file.arrayBuffer()
  const text = new TextDecoder('latin1').decode(new Uint8Array(buffer))
  const PT_TO_CM = 0.0352778
  const results: Array<{ widthCm: number; heightCm: number }> = []
  const re = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const x0 = parseFloat(m[1]), y0 = parseFloat(m[2])
    const x1 = parseFloat(m[3]), y1 = parseFloat(m[4])
    const wPt = Math.abs(x1 - x0), hPt = Math.abs(y1 - y0)
    results.push({
      widthCm:  Math.round(wPt * PT_TO_CM * 10) / 10,
      heightCm: Math.round(hPt * PT_TO_CM * 10) / 10,
    })
  }
  const pageCountMatch = text.match(/\/Type\s*\/Page[^s]/g)
  const pageCount = pageCountMatch ? pageCountMatch.length : results.length
  const unique = results.slice(0, Math.max(pageCount, 1))
  return unique.length > 0 ? unique : []
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _rid = 0
function rowId() { return `row_${++_rid}_${Date.now()}` }

function initRowConfig(p: ProductInfo): Pick<ProductRow, 'selectedFinitions' | 'selectedDelai' | 'selectedSides'> {
  const finitionGroups = normalizeFinitions(p.finitions ?? [])
  const delais: any[] = p.delai_options ?? []
  const sidesFinitions = p.sides_finitions

  const selectedFinitions: Record<string, string | string[]> = {}
  finitionGroups.forEach(g => {
    if (g.display_type === 'select') {
      selectedFinitions[g.id] = g.options.find(o => o.default_selected)?.id ?? ''
    } else {
      selectedFinitions[g.id] = g.options.filter(o => o.default_selected).map(o => o.id)
    }
  })

  const selectedDelai = delais.length > 0 ? [...delais].sort((a, b) => a.days - b.days)[0] : null

  const selectedSides: Record<string, string[]> = {}
  if (sidesFinitions?.enabled && sidesFinitions.sides?.length > 0) {
    const firstOptId = sidesFinitions.options?.[0]?.id ?? ''
    sidesFinitions.sides.forEach((s: any) => { selectedSides[s.id] = firstOptId ? [firstOptId] : [] })
  }

  return { selectedFinitions, selectedDelai, selectedSides }
}

function emptyRow(): ProductRow {
  return { id: rowId(), product_id: '', width_cm: '', height_cm: '', quantity: 1, expanded: false, selectedFinitions: {}, selectedDelai: null, selectedSides: {}, uploadProgress: 0, fileState: 'none', batNote: '', forceValidate: false }
}

// ── Upload with progress ──────────────────────────────────────────────────────

function uploadFileWithProgress(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('itemId', `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        try { resolve(JSON.parse(xhr.responseText)) }
        catch { reject(new Error('Invalid response')) }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', '/api/r2-upload')
    xhr.send(fd)
  })
}

/** Formate un supplément de prix selon son type */
function fmtSuppl(priceType: string, amount: number): string {
  if (priceType === 'percent') return `+${amount}%`
  if (priceType === 'per_m2')  return `+${formatPrice(amount)}/m²`
  return `+${formatPrice(amount)}`  // 'fixed' et par défaut → euros
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommandeRapideClient({ products }: { products: ProductInfo[] }) {
  const { addItem } = useCart()
  const fileRef = useRef<HTMLInputElement>(null)
  // Extra products injected from Angelo preload (products from quote not necessarily in available list)
  const [extraProducts, setExtraProducts] = useState<ProductInfo[]>([])

  const [rows, setRows] = useState<ProductRow[]>(() => {
    // Lire les lignes pré-chargées par Angelo (si présentes)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('comink_angelo_preload')
        if (raw) {
          localStorage.removeItem('comink_angelo_preload')
          const items = JSON.parse(raw) as Record<string, unknown>[]
          if (Array.isArray(items) && items.length > 0) {
            // Collect products embedded in preload that are not already in the products prop
            const extra: ProductInfo[] = []
            const mapped: ProductRow[] = items.map((item) => {
              const pid = (item.product_id ?? '') as string
              const product = item.product as Record<string, unknown> | undefined

              // Add embedded product to extra list if not already available
              if (pid && product && !products.find(p => p.id === pid)) {
                extra.push({
                  id:             pid,
                  name:           (product.name as string) || 'Produit',
                  category:       (product.category as string) || '',
                  product_type:   ((product.product_type as string) || 'sur_mesure') as 'sur_mesure' | 'taille_standard',
                  price_per_m2:   product.price_per_m2 as number | undefined,
                  standard_sizes: product.standard_sizes as ProductInfo['standard_sizes'],
                  finitions:      product.finitions as any[],
                  delai_options:  product.delai_options as any[],
                  sides_finitions:product.sides_finitions as any,
                  available:      true,
                })
              }

              // Use finitions/délai/sides from the quote item directly (preserves the actual order config)
              // Fall back to product defaults if not present
              let selectedFinitions = (item.selectedFinitions as Record<string, string | string[]> | null) ?? null
              let selectedDelai     = (item.selectedDelai as any) ?? null
              let selectedSides     = (item.selectedSides as Record<string, string[]> | null) ?? null

              if (!selectedFinitions || Object.keys(selectedFinitions).length === 0) {
                const finitionGroups = normalizeFinitions((product?.finitions as any[]) ?? [])
                const computed: Record<string, string | string[]> = {}
                finitionGroups.forEach((g: any) => {
                  if (g.display_type === 'select') {
                    computed[g.id] = g.options.find((o: any) => o.default_selected)?.id ?? ''
                  } else {
                    computed[g.id] = g.options.filter((o: any) => o.default_selected).map((o: any) => o.id)
                  }
                })
                selectedFinitions = computed
              }
              if (!selectedDelai) {
                const delais: any[] = (product?.delai_options as any[]) ?? []
                selectedDelai = delais.length > 0
                  ? ([...delais].sort((a: any, b: any) => a.days - b.days)[0])
                  : null
              }
              if (!selectedSides) {
                const sidesFinitions = product?.sides_finitions as any
                const computed: Record<string, string[]> = {}
                if (sidesFinitions?.enabled) {
                  sidesFinitions.sides?.forEach((s: any) => { computed[s.id] = [] })
                }
                selectedSides = computed
              }

              return {
                id:               rowId(),
                product_id:       pid,
                width_cm:         item.width_cm != null ? Number(item.width_cm) : '',
                height_cm:        item.height_cm != null ? Number(item.height_cm) : '',
                quantity:         Number(item.quantity) || 1,
                expanded:         true,  // ouvrir le panel config pour que les finitions soient visibles
                selectedFinitions,
                selectedDelai,
                selectedSides,
                uploadProgress:   0,
                fileState:        'none',
                batNote:          '',
                forceValidate:    false,
              }
            })
            // Schedule extra products injection after render
            if (extra.length > 0) {
              setTimeout(() => setExtraProducts(extra), 0)
            }
            return mapped
          }
        }
      } catch {}
    }
    return [emptyRow()]
  })
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importInfo, setImportInfo] = useState<string | null>(null)
  const [addedAll, setAddedAll] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const allProducts = [...products, ...extraProducts.filter(ep => !products.find(p => p.id === ep.id))]
  const surMesureProducts = allProducts.filter(p => p.product_type === 'sur_mesure')
  const standardProducts  = allProducts.filter(p => p.product_type === 'taille_standard')

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getProduct(id: string): ProductInfo | undefined {
    return products.find(p => p.id === id) ?? extraProducts.find(p => p.id === id)
  }

  // ── Row manipulation ──────────────────────────────────────────────────────

  function addRow() {
    setRows(r => [...r, emptyRow()])
  }

  function removeRow(id: string) {
    setRows(r => r.filter(row => row.id !== id))
    setErrors(e => { const n = { ...e }; delete n[id]; return n })
  }

  function updateRow(id: string, patch: Partial<ProductRow>) {
    setRows(r => r.map(row => {
      if (row.id !== id) return row
      const updated = { ...row, ...patch }
      // When product changes, reinitialize finitions/délai
      if (patch.product_id !== undefined && patch.product_id !== row.product_id) {
        const p = getProduct(patch.product_id)
        if (p) return { ...updated, ...initRowConfig(p) }
        return { ...updated, selectedFinitions: {}, selectedDelai: null, selectedSides: {} }
      }
      return updated
    }))
    if (errors[id]) setErrors(e => { const n = { ...e }; delete n[id]; return n })
  }

  function duplicateRow(row: ProductRow) {
    setRows(r => {
      const idx = r.findIndex(x => x.id === row.id)
      const newRow = { ...row, id: rowId() }
      return [...r.slice(0, idx + 1), newRow, ...r.slice(idx + 1)]
    })
  }

  // ── Upload + analyse ──────────────────────────────────────────────────────

  const uploadAndAnalyzeRow = useCallback(async (rowId: string, file: File, row: ProductRow) => {
    // 1. Upload avec progression
    updateRow(rowId, { fileState: 'uploading', uploadProgress: 0 })

    let uploadResult: { url: string; name: string }
    try {
      uploadResult = await uploadFileWithProgress(file, (pct) => {
        updateRow(rowId, { uploadProgress: pct })
      })
      updateRow(rowId, { fileUrl: uploadResult.url, fileName: uploadResult.name, uploadProgress: 100 })
    } catch {
      updateRow(rowId, { fileState: 'error', uploadProgress: 0 })
      return
    }

    // 2. Analyse avec timeout 30s
    updateRow(rowId, { fileState: 'analyzing' })
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 30_000)

    try {
      const dims = row.width_cm && row.height_cm ? `${row.width_cm} × ${row.height_cm} cm` : undefined
      const product = products.find(p => p.id === row.product_id)

      const res = await fetch('/api/crm/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          file_url: uploadResult.url,
          file_name: uploadResult.name,
          product_name: product?.name,
          dimensions: dims,
        }),
      })
      const result = await res.json()
      updateRow(rowId, {
        fileState: 'done',
        analysis: result.error ? undefined : result,
      })
    } catch {
      updateRow(rowId, { fileState: 'done' }) // timeout ou erreur — pas d'analyse
    } finally {
      clearTimeout(timeout)
    }
  }, [products, updateRow])

  // ── Price calculation ──────────────────────────────────────────────────────

  function calcUnitPrice(row: ProductRow): number {
    const p = getProduct(row.product_id)
    if (!p) return 0

    let basePrice = 0
    if (p.product_type === 'sur_mesure') {
      if (!p.price_per_m2 || !row.width_cm || !row.height_cm) return 0
      basePrice = calculatePricePerM2(Number(row.width_cm), Number(row.height_cm), p.price_per_m2)
    } else {
      const sizes = p.standard_sizes ?? []
      if (row.width_cm && row.height_cm) {
        const match = sizes.find(s =>
          Math.abs(s.width_cm - Number(row.width_cm)) < 0.5 &&
          Math.abs(s.height_cm - Number(row.height_cm)) < 0.5
        )
        if (match) basePrice = match.price
      }
      if (!basePrice) basePrice = sizes[0]?.price ?? 0
    }
    if (!basePrice) return 0

    const surfaceM2 = p.product_type === 'sur_mesure'
      ? (Number(row.width_cm) / 100) * (Number(row.height_cm) / 100) : 0

    // Finitions supplement
    const finitionGroups = normalizeFinitions(p.finitions ?? [])
    const finitionsPrice = finitionGroups.reduce((total, g) => {
      const sel = row.selectedFinitions[g.id]
      const opts: FinitionOption[] = g.display_type === 'select'
        ? g.options.filter(o => o.id === sel)
        : g.options.filter(o => Array.isArray(sel) && sel.includes(o.id))
      return total + opts.reduce((s, o) => {
        if (o.price_type === 'fixed')   return s + (o.price_supplement || 0)
        if (o.price_type === 'percent') return s + basePrice * (o.price_supplement || 0) / 100
        if (o.price_type === 'per_m2')  return s + surfaceM2 * (o.price_supplement || 0)
        return s
      }, 0)
    }, 0)

    // Surcharge délai sur le sous-total complet (base + finitions)
    const priceBeforeDelai = basePrice + finitionsPrice
    const delaiSurcharge = row.selectedDelai?.surcharge_percent
      ? priceBeforeDelai * row.selectedDelai.surcharge_percent / 100 : 0

    return priceBeforeDelai + delaiSurcharge
  }

  function totalRows(): number {
    return rows.reduce((s, r) => s + calcUnitPrice(r) * r.quantity, 0)
  }

  // ── PDF import (multiple files) ───────────────────────────────────────────

  const handlePdfImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const invalid = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'))
    if (invalid.length === files.length) {
      setImportError('Veuillez sélectionner des fichiers PDF.')
      return
    }

    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    setImporting(true)
    setImportError(null)
    setImportInfo(null)

    try {
      const allNewRows: ProductRow[] = []
      let totalPages = 0

      for (const file of pdfs) {
        const allPages = await parsePdfPageSizes(file)
        if (allPages.length === 0) continue
        // Limiter à 20 pages par fichier pour éviter de créer des centaines de lignes
        const MAX_PAGES = 20
        const pages = allPages.slice(0, MAX_PAGES)
        if (allPages.length > MAX_PAGES) {
          setImportInfo(`⚠ Fichier ${file.name} : ${allPages.length} pages détectées — seules les ${MAX_PAGES} premières sont importées.`)
        }
        totalPages += pages.length
        const defaultProduct = surMesureProducts[0]
        const defaultConfig = defaultProduct ? initRowConfig(defaultProduct) : { selectedFinitions: {}, selectedDelai: null, selectedSides: {} }
        pages.forEach((pg) => {
          allNewRows.push({
            id: rowId(),
            product_id: defaultProduct?.id ?? '',
            width_cm: pg.widthCm,
            height_cm: pg.heightCm,
            quantity: 1,
            expanded: false,
            ...defaultConfig,
            uploadProgress: 0,
            fileState: 'none',
            batNote: '',
            forceValidate: false,
            // Pas d'upload automatique — les dimensions sont extraites, le fichier s'ajoute manuellement
          })
        })
      }

      if (allNewRows.length === 0) {
        setImportError('Impossible de lire les dimensions. Vérifiez que les fichiers ne sont pas protégés.')
        return
      }

      setRows(r => {
        const onlyEmpty = r.length === 1 && !r[0].product_id && !r[0].width_cm
        return onlyEmpty ? allNewRows : [...r, ...allNewRows]
      })

      const fc = pdfs.length
      setImportInfo(`${totalPages} page${totalPages > 1 ? 's' : ''} importée${totalPages > 1 ? 's' : ''} depuis ${fc} fichier${fc > 1 ? 's' : ''} — dimensions extraites`)
    } catch {
      setImportError('Erreur lors de la lecture des PDFs.')
    } finally {
      setImporting(false)
    }
  }, [surMesureProducts, uploadAndAnalyzeRow])

  // ── Add all to cart ───────────────────────────────────────────────────────

  function validateAndAddToCart() {
    const newErrors: Record<string, string> = {}
    let valid = true

    for (const row of rows) {
      if (!row.product_id) { newErrors[row.id] = 'Choisissez un produit'; valid = false; continue }
      const p = getProduct(row.product_id)!
      if (p.product_type === 'sur_mesure') {
        if (!row.width_cm || !row.height_cm) { newErrors[row.id] = 'Dimensions requises'; valid = false }
      }
    }

    // Vérifier les fichiers non conformes sans forceValidate
    for (const row of rows) {
      if (row.analysis?.status === 'error' && !row.forceValidate) {
        newErrors[row.id] = 'Fichier non conforme — validez quand même ou corrigez le fichier'
        valid = false
      }
    }

    setErrors(newErrors)
    if (!valid) return

    for (const row of rows) {
      const p = getProduct(row.product_id)!
      const unitPrice = calcUnitPrice(row)
      addItem({
        product_id: p.id,
        product: p as any,
        quantity: row.quantity,
        width_cm:  p.product_type === 'sur_mesure' ? Number(row.width_cm)  : undefined,
        height_cm: p.product_type === 'sur_mesure' ? Number(row.height_cm) : undefined,
        unit_price: unitPrice,
        total_price: unitPrice * row.quantity,
        selectedFinitions: row.selectedFinitions,
        selectedDelai: row.selectedDelai,
        selectedSides: row.selectedSides,
        file_url: row.fileUrl,
        file_name: row.fileName,
        file_analysis: row.analysis,
        bat_note: row.batNote || undefined,
      } as any)
    }

    setAddedAll(true)
    setTimeout(() => setAddedAll(false), 3000)
    setRows([emptyRow()])
  }

  // ── Finitions & délai panel per row ──────────────────────────────────────

  function RowConfigPanel({ row }: { row: ProductRow }) {
    const p = getProduct(row.product_id)
    if (!p) return null

    const finitionGroups = normalizeFinitions(p.finitions ?? [])
    const delais = [...(p.delai_options ?? [])].sort((a: any, b: any) => a.days - b.days)
    const sidesFinitions = p.sides_finitions
    const hasSides = sidesFinitions?.enabled && (sidesFinitions.sides?.length ?? 0) > 0

    if (finitionGroups.length === 0 && delais.length === 0 && !hasSides) return null

    return (
      <div className="px-4 pb-4 pt-3 bg-blue-50/60 border-t border-blue-100 space-y-4">

        {/* Finition groups */}
        {finitionGroups.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Finitions</p>
            <div className="space-y-3">
              {finitionGroups.map(g => {
                const sel = row.selectedFinitions[g.id]
                return (
                  <div key={g.id}>
                    {g.label && <p className="text-xs font-semibold text-slate-600 mb-1.5">{g.label}</p>}
                    {g.display_type === 'select' ? (
                      <div className="relative max-w-xs">
                        <select
                          value={(sel as string) ?? ''}
                          onChange={e => updateRow(row.id, { selectedFinitions: { ...row.selectedFinitions, [g.id]: e.target.value } })}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {!g.required && <option value="">— Aucune —</option>}
                          {g.options.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                              {o.price_supplement > 0 ? ` (${fmtSuppl(o.price_type, o.price_supplement)})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {g.options.map(o => {
                          const isSel = Array.isArray(sel) && sel.includes(o.id)
                          return (
                            <label key={o.id}
                              className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm',
                                isSel ? 'border-blue-500 bg-blue-100 text-blue-700 font-semibold' : 'border-slate-200 bg-white hover:border-blue-300'
                              )}>
                              <input type="checkbox" checked={isSel} className="w-3.5 h-3.5 accent-blue-600"
                                onChange={() => {
                                  const cur = Array.isArray(sel) ? sel : []
                                  const next = isSel ? cur.filter(x => x !== o.id) : [...cur, o.id]
                                  updateRow(row.id, { selectedFinitions: { ...row.selectedFinitions, [g.id]: next } })
                                }} />
                              <span>{o.label}</span>
                              {o.price_supplement > 0 && (
                                <span className="text-xs font-bold text-blue-500">
                                  {fmtSuppl(o.price_type, o.price_supplement)}
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sides finitions */}
        {hasSides && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Finitions par côté</p>
            <div className="space-y-3">
              {sidesFinitions.sides.map((side: any) => {
                const currentSel: string[] = row.selectedSides[side.id] ?? []
                const incompatibilities: Array<[string, string]> = sidesFinitions.incompatibilities ?? []
                return (
                  <div key={side.id}>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">{side.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {sidesFinitions.options.map((opt: any) => {
                        const isSel = currentSel.includes(opt.id)
                        const incompatibleWith = incompatibilities
                          .filter(([a, b]) => a === opt.id || b === opt.id)
                          .map(([a, b]) => a === opt.id ? b : a)
                        const blocked = !isSel && incompatibleWith.some((id: string) => currentSel.includes(id))
                        return (
                          <button key={opt.id}
                            disabled={blocked}
                            onClick={() => {
                              let nextSel: string[]
                              if (isSel) {
                                nextSel = currentSel.filter(id => id !== opt.id)
                              } else {
                                nextSel = [...currentSel.filter((id: string) => !incompatibleWith.includes(id)), opt.id]
                              }
                              updateRow(row.id, { selectedSides: { ...row.selectedSides, [side.id]: nextSel } })
                            }}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                              isSel ? 'border-blue-500 bg-blue-100 text-blue-700' :
                              blocked ? 'border-slate-100 text-slate-300 cursor-not-allowed opacity-40' :
                              'border-slate-200 bg-white hover:border-blue-300 text-slate-600'
                            )}
                          >
                            <span className={cn(
                              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                              isSel ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                            )}>
                              {isSel && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            {opt.label}
                            {opt.price_supplement > 0 && (
                              <span className="font-bold text-blue-500">
                                {fmtSuppl(opt.price_type, opt.price_supplement)}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Délais */}
        {delais.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Délai de production</p>
            <div className="flex gap-1.5 flex-wrap">
              {delais.map((d: any) => {
                const isSel = row.selectedDelai?.id === d.id
                const pct = d.surcharge_percent || 0
                const dt = addWorkingDays(d.days)
                const day = dt.getDate()
                const mon = dt.toLocaleDateString('fr-BE', { month: 'short' })
                const wday = dt.toLocaleDateString('fr-BE', { weekday: 'short' })
                return (
                  <button key={d.id}
                    onClick={() => updateRow(row.id, { selectedDelai: d })}
                    title={d.label}
                    className={cn(
                      'flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all text-center min-w-[64px]',
                      isSel ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-blue-400'
                    )}
                  >
                    <span className={cn('text-sm font-extrabold leading-tight', isSel ? 'text-white' : 'text-slate-800')}>
                      {day} {mon}
                    </span>
                    <span className={cn('text-[10px] font-medium mt-0.5', isSel ? 'text-blue-100' : 'text-slate-400')}>{wday}</span>
                    <span className={cn(
                      'text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-full',
                      isSel ? 'bg-white/20 text-white' :
                      pct === 0 ? 'bg-green-50 text-green-600 border border-green-200' :
                      pct <= 20 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-red-50 text-red-500 border border-red-200'
                    )}>
                      {pct === 0 ? 'Std' : `+${pct}%`}
                    </span>
                  </button>
                )
              })}
            </div>
            {row.selectedDelai && (
              <p className="text-xs text-slate-500 mt-2">
                <strong className="text-slate-700">{row.selectedDelai.label}</strong>
                {' — livraison le '}
                <strong className="text-blue-600">
                  {addWorkingDays(row.selectedDelai.days).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </strong>
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const validRows = rows.filter(r => r.product_id && (getProduct(r.product_id)?.product_type === 'taille_standard' || (r.width_cm && r.height_cm)))
  const grandTotal = totalRows()

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">⚡ Commande rapide</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ajoutez vos lignes directement ou importez des PDFs — une ligne par page.
            </p>
          </div>
          {/* PDF import button */}
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={handlePdfImport} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <LottiePlayer src="/animations/scan.json" className="w-5 h-5" loop autoplay />
                  Lecture…
                </>
              ) : (
                <><Upload className="w-4 h-4" /> Importer des PDFs</>
              )}
            </button>
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>
        </div>

        {/* Import feedback */}
        {importError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {importError}
            <button onClick={() => setImportError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {importInfo && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
            <FileText className="w-4 h-4 flex-shrink-0" />
            {importInfo}
            <button onClick={() => setImportInfo(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {/* Column headers */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 grid gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: '2fr 90px 90px 80px 100px 100px 80px' }}>
            <div>Produit</div>
            <div className="text-center">Largeur (cm)</div>
            <div className="text-center">Hauteur (cm)</div>
            <div className="text-center">Qté</div>
            <div className="text-right">Prix/u HTVA</div>
            <div className="text-right">Total HTVA</div>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {rows.map((row, idx) => {
              const p = getProduct(row.product_id)
              const isSurMesure = p?.product_type === 'sur_mesure'
              const unitPrice = calcUnitPrice(row)
              const rowTotal = unitPrice * row.quantity
              const rowError = errors[row.id]

              // Check if this product has configurable options
              const finitionGroups = p ? normalizeFinitions(p.finitions ?? []) : []
              const delais = p?.delai_options ?? []
              const hasSides = p?.sides_finitions?.enabled && (p?.sides_finitions?.sides?.length ?? 0) > 0
              const hasConfig = finitionGroups.length > 0 || delais.length > 0 || hasSides

              return (
                <div key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  {/* Main row */}
                  <div
                    className={cn('px-4 py-3 grid gap-2 items-center transition-colors', rowError ? 'bg-red-50' : '')}
                    style={{ gridTemplateColumns: '2fr 90px 90px 80px 100px 100px 80px' }}
                  >
                    {/* Product selector */}
                    <div>
                      <div className="relative">
                        <select
                          value={row.product_id}
                          onChange={e => updateRow(row.id, { product_id: e.target.value, width_cm: '', height_cm: '' })}
                          className={cn(
                            'w-full border rounded-lg px-2.5 py-2 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500',
                            rowError ? 'border-red-400 bg-red-50' : 'border-slate-200'
                          )}
                        >
                          <option value="">— Choisir un produit —</option>
                          {surMesureProducts.length > 0 && (
                            <optgroup label="Sur mesure">
                              {surMesureProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {standardProducts.length > 0 && (
                            <optgroup label="Taille standard">
                              {standardProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      {rowError && <p className="text-[11px] text-red-500 mt-0.5 font-medium">{rowError}</p>}

                      {/* Standard size selector */}
                      {p?.product_type === 'taille_standard' && (p.standard_sizes?.length ?? 0) > 0 && (
                        <div className="relative mt-1">
                          <select
                            value={`${row.width_cm}x${row.height_cm}`}
                            onChange={e => {
                              const [w, h] = e.target.value.split('x').map(Number)
                              updateRow(row.id, { width_cm: w, height_cm: h })
                            }}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs appearance-none pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                          >
                            <option value="x">— Choisir une taille —</option>
                            {(p.standard_sizes ?? []).map(s => (
                              <option key={s.label} value={`${s.width_cm}x${s.height_cm}`}>
                                {s.label} — {s.width_cm}×{s.height_cm} cm — {formatPrice(s.price)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                      )}

                      {/* Config toggle */}
                      {p && hasConfig && (
                        <button
                          onClick={() => updateRow(row.id, { expanded: !row.expanded })}
                          className={cn(
                            'mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2 py-1 transition-all',
                            row.expanded
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                          )}
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Finitions &amp; délai
                          {row.expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Width */}
                    <div>
                      <input
                        type="number" step="0.1" min="1"
                        disabled={!p || !isSurMesure}
                        value={row.width_cm}
                        onChange={e => updateRow(row.id, { width_cm: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder={isSurMesure ? '100' : '—'}
                        className={cn(
                          'w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500',
                          !p || !isSurMesure ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'border-slate-200'
                        )}
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <input
                        type="number" step="0.1" min="1"
                        disabled={!p || !isSurMesure}
                        value={row.height_cm}
                        onChange={e => updateRow(row.id, { height_cm: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder={isSurMesure ? '50' : '—'}
                        className={cn(
                          'w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500',
                          !p || !isSurMesure ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'border-slate-200'
                        )}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateRow(row.id, { quantity: Math.max(1, row.quantity - 1) })}
                        className="px-2 py-2 text-slate-500 hover:bg-slate-100 font-bold text-sm flex-shrink-0"
                      >−</button>
                      <span className="flex-1 text-center text-sm font-bold border-x border-slate-200 py-2">{row.quantity}</span>
                      <button
                        onClick={() => updateRow(row.id, { quantity: row.quantity + 1 })}
                        className="px-2 py-2 text-slate-500 hover:bg-slate-100 font-bold text-sm flex-shrink-0"
                      >+</button>
                    </div>

                    {/* Unit price */}
                    <div className="text-right">
                      {unitPrice > 0
                        ? <span className="text-sm font-semibold text-slate-700">{formatPrice(unitPrice)}</span>
                        : <span className="text-sm text-slate-300">—</span>}
                    </div>

                    {/* Row total */}
                    <div className="text-right">
                      {rowTotal > 0
                        ? <span className="text-sm font-bold text-blue-600">{formatPrice(rowTotal)}</span>
                        : <span className="text-sm text-slate-300">—</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => duplicateRow(row)}
                        title="Dupliquer la ligne"
                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        title="Supprimer"
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable config panel */}
                  {row.expanded && <RowConfigPanel row={row} />}

                  {/* Zone fichier — upload + analyse */}
                  {(row.fileState !== 'none' || row.fileObj || row.fileName) && (
                    <div className="border-t border-slate-100 px-4 pt-3 pb-3 mt-0">

                      {/* État upload */}
                      {row.fileState === 'uploading' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <LottiePlayer src="/animations/scan.json" className="w-5 h-5" loop autoplay />
                            <span>Upload… {row.uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
                              style={{ width: `${row.uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* État analyse */}
                      {row.fileState === 'analyzing' && (
                        <div className="flex items-center gap-2 text-xs text-violet-600">
                          <LottiePlayer src="/animations/scan.json" className="w-5 h-5" loop autoplay />
                          <span className="animate-pulse">Analyse IA en cours…</span>
                        </div>
                      )}

                      {/* Résultat analyse */}
                      {row.fileState === 'done' && row.analysis && (
                        <div className="space-y-2">
                          {/* CMYK — critique en premier */}
                          {(() => {
                            const cmykCheck = row.analysis.checks.find(c => c.id === 'color_mode')
                            if (!cmykCheck) return null
                            if (cmykCheck.status === 'error') return (
                              <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg p-2.5">
                                <span className="text-red-500 text-base flex-shrink-0">🚫</span>
                                <div>
                                  <p className="text-xs font-black text-red-700">FICHIER RGB — NON CONFORME</p>
                                  <p className="text-[11px] text-red-600 mt-0.5">{cmykCheck.message}</p>
                                </div>
                              </div>
                            )
                            if (cmykCheck.status === 'ok') return (
                              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                <span className="text-emerald-500">✓</span>
                                <p className="text-xs font-bold text-emerald-700">CMJN ✓ Mode couleur conforme</p>
                              </div>
                            )
                            return (
                              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                <span className="text-amber-500">⚠</span>
                                <p className="text-xs font-semibold text-amber-700">{cmykCheck.message}</p>
                              </div>
                            )
                          })()}

                          {/* Score global */}
                          <div className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold',
                            row.analysis.status === 'ok' ? 'bg-emerald-50 text-emerald-700' :
                            row.analysis.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          )}>
                            <span>{row.analysis.summary}</span>
                            <span className="text-base font-black">{row.analysis.score}/100</span>
                          </div>

                          {/* Autres checks (sans CMYK déjà affiché) */}
                          <div className="space-y-1">
                            {row.analysis.checks.filter(c => c.id !== 'color_mode').map(check => (
                              <div key={check.id} className={cn(
                                'flex items-start gap-1.5 text-[11px] px-2 py-1 rounded',
                                check.status === 'ok' ? 'text-emerald-600' :
                                check.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                              )}>
                                <span className="flex-shrink-0">{check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗'}</span>
                                <span><strong>{check.label}</strong> — {check.message}</span>
                              </div>
                            ))}
                          </div>

                          {/* Si problèmes : option BAT + force validate */}
                          {row.analysis.status !== 'ok' && (
                            <div className="border border-amber-200 bg-amber-50 rounded-lg p-2.5 space-y-2">
                              <p className="text-[11px] font-bold text-amber-800">
                                {row.forceValidate ? '✓ Fichier accepté avec réserves' : '⚠ Ce fichier comporte des non-conformités'}
                              </p>
                              <textarea
                                placeholder="Note BAT (ex: couleur RVB assumée, pas à l'échelle, etc.)"
                                value={row.batNote}
                                onChange={e => updateRow(row.id, { batNote: e.target.value })}
                                className="w-full text-[11px] border border-amber-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white resize-none"
                                rows={2}
                              />
                              <button
                                onClick={() => updateRow(row.id, { forceValidate: !row.forceValidate })}
                                className={cn(
                                  'text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors',
                                  row.forceValidate
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                )}
                              >
                                {row.forceValidate ? '✓ Validé avec réserves' : 'Valider quand même →'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Erreur upload */}
                      {row.fileState === 'error' && (
                        <p className="text-xs text-red-500">Erreur lors de l&apos;upload. Réessayez.</p>
                      )}

                      {/* Nom de fichier si uploadé */}
                      {row.fileName && row.fileState !== 'uploading' && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">📎 {row.fileName}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer: add row + total */}
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between">
            <button onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
            {grandTotal > 0 && (
              <div className="text-right">
                <span className="text-xs text-slate-400 mr-2">Total HTVA estimé</span>
                <span className="text-lg font-extrabold text-blue-600">{formatPrice(grandTotal)}<span className="text-xs font-normal ml-1 text-blue-400">HTVA</span></span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <p className="text-sm text-slate-500">
            {validRows.length > 0
              ? `${validRows.length} ligne${validRows.length > 1 ? 's' : ''} prête${validRows.length > 1 ? 's' : ''} à être ajoutée${validRows.length > 1 ? 's' : ''} au panier`
              : 'Ajoutez des lignes pour composer votre commande'}
          </p>
          <div className="flex items-center gap-3">
            <Link href="/panier"
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Voir le panier →
            </Link>
            <button
              onClick={validateAndAddToCart}
              disabled={validRows.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-sm"
            >
              {addedAll
                ? <><CheckCircle className="w-4 h-4" /> Ajouté au panier !</>
                : <><ShoppingCart className="w-4 h-4" /> Ajouter tout au panier</>
              }
            </button>
          </div>
        </div>

        {/* PDF import info box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-800 mb-1">Import PDF — Comment ça marche ?</p>
              <ul className="text-xs text-blue-700 space-y-1 leading-relaxed">
                <li>• Préparez un ou plusieurs PDFs où <strong>chaque page correspond à une pièce à imprimer</strong> avec ses dimensions finales.</li>
                <li>• Les fichiers sont analysés localement dans votre navigateur — aucun upload sur nos serveurs.</li>
                <li>• Les dimensions (largeur × hauteur en cm) sont lues automatiquement depuis les métadonnées de chaque page.</li>
                <li>• Cliquez sur <strong>Finitions &amp; délai</strong> pour personnaliser chaque ligne selon le produit choisi.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
