'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, FileText, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

// ── Belgian holidays ──────────────────────────────────────────────────────
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

import type { Product, StandardSize } from '@/types'
import { CATEGORY_LABELS, formatPrice, calculatePricePerM2, calcVAT, calcTTC } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'

// ── Types ─────────────────────────────────────────────────────────────────
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

// Side id → grid position
const SIDE_POS: Record<string, 'top'|'bottom'|'left'|'right'> = { haut:'top', bas:'bottom', gauche:'left', droit:'right' }
const SIDE_ICON: Record<string, string> = { top:'↑', bottom:'↓', left:'←', right:'→' }

// ── Component ─────────────────────────────────────────────────────────────
interface Props { product: Product }

export default function ProduitClient({ product }: Props) {
  const delais: any[]       = (product as any).delai_options ?? []
  const sidesFinitions: any = (product as any).sides_finitions
  const finitionGroups      = normalizeFinitions((product as any).finitions ?? [])
  const vatRate: number     = (product as any).vat_rate ?? 21

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize,  setSelectedSize]  = useState<StandardSize | null>(product.standard_sizes?.[0] || null)
  const [width,         setWidth]         = useState(product.min_width_cm  || 100)
  const [height,        setHeight]        = useState(product.min_height_cm || 100)
  const [quantity,      setQuantity]      = useState(1)
  const [added,         setAdded]         = useState(false)
  const [selectedDelai, setSelectedDelai] = useState<any>(delais[0] ?? null)

  // ── Finition groups state ──────────────────────────────────────────────
  const [selectedFinitions, setSelectedFinitions] = useState<Record<string, string | string[]>>(() => {
    const init: Record<string, string | string[]> = {}
    finitionGroups.forEach(g => {
      if (g.display_type === 'select') {
        init[g.id] = g.options.find(o => o.default_selected)?.id ?? ''
      } else {
        init[g.id] = g.options.filter(o => o.default_selected).map(o => o.id)
      }
    })
    return init
  })

  function toggleCheckbox(gid: string, oid: string) {
    setSelectedFinitions(prev => {
      const cur = (prev[gid] as string[]) ?? []
      return { ...prev, [gid]: cur.includes(oid) ? cur.filter(x => x !== oid) : [...cur, oid] }
    })
  }

  // ── Sides state ───────────────────────────────────────────────────────
  const [selectedSides, setSelectedSides] = useState<Record<string, string[]>>(() => {
    if (!sidesFinitions?.enabled) return {}
    const firstOptId = sidesFinitions.options[0]?.id ?? ''
    return Object.fromEntries(
      sidesFinitions.sides.map((s: any) => [s.id, firstOptId ? [firstOptId] : []])
    )
  })
  const [openSide, setOpenSide] = useState<string | null>(null)
  const [sameAllSides, setSameAllSides] = useState(false)
  const sidesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openSide) return
    const handler = (e: MouseEvent) => {
      if (sidesRef.current && !sidesRef.current.contains(e.target as Node)) setOpenSide(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openSide])

  function handleSameAllSides(checked: boolean) {
    setSameAllSides(checked)
    if (checked && sidesFinitions?.sides?.length) {
      // Sync all sides to match the first side's current selection
      const firstId = sidesFinitions.sides[0].id
      setSelectedSides(prev => {
        const ref = prev[firstId] ?? []
        return Object.fromEntries(sidesFinitions.sides.map((s: any) => [s.id, [...ref]]))
      })
      setOpenSide(null)
    }
  }

  function toggleSideOption(sideId: string, optId: string) {
    const incompatibilities: Array<[string, string]> = sidesFinitions?.incompatibilities ?? []
    setSelectedSides(prev => {
      const current = prev[sideId] ?? []
      let nextSel: string[]
      if (current.includes(optId)) {
        nextSel = current.filter(id => id !== optId)
      } else {
        const incompatibleWith = incompatibilities
          .filter(([a, b]) => a === optId || b === optId)
          .map(([a, b]) => a === optId ? b : a)
        nextSel = [...current.filter(id => !incompatibleWith.includes(id)), optId]
      }
      if (sameAllSides) {
        // Propagate to all sides
        return Object.fromEntries(sidesFinitions.sides.map((s: any) => [s.id, nextSel]))
      }
      return { ...prev, [sideId]: nextSel }
    })
  }

  const { addItem } = useCart()

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []
  const isSurMesure = product.product_type === 'sur_mesure'
  const minW = product.min_width_cm || 1, maxW = product.max_width_cm || 99999
  const minH = product.min_height_cm || 1, maxH = product.max_height_cm || 99999
  const widthError  = width  < minW ? `Min ${minW} cm`  : width  > maxW ? `Max ${maxW} cm`  : null
  const heightError = height < minH ? `Min ${minH} cm` : height > maxH ? `Max ${maxH} cm` : null
  const hasError = !!(widthError || heightError)
  const surfaceM2 = isSurMesure ? (width / 100) * (height / 100) : 0

  const basePrice = isSurMesure
    ? (product.price_per_m2 ? calculatePricePerM2(width, height, product.price_per_m2) : 0)
    : (selectedSize?.price || 0)

  const finitionsPrice = finitionGroups.reduce((total, g) => {
    const sel = selectedFinitions[g.id]
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

  const sidesPrice: number = sidesFinitions?.enabled
    ? sidesFinitions.sides.reduce((sum: number, side: any) => {
        const selectedOptIds: string[] = selectedSides[side.id] ?? []
        return sum + selectedOptIds.reduce((sideSum: number, optId: string) => {
          const opt = sidesFinitions.options.find((o: any) => o.id === optId)
          if (!opt?.price_supplement) return sideSum
          const pos = SIDE_POS[side.id]
          const isVert = pos === 'left' || pos === 'right'
          const lenM = isSurMesure
            ? (isVert ? height / 100 : width / 100)
            : (isVert ? (selectedSize?.height_cm ?? 100) / 100 : (selectedSize?.width_cm ?? 100) / 100)
          if (opt.price_type === 'fixed')   return sideSum + opt.price_supplement
          if (opt.price_type === 'per_ml')  return sideSum + lenM * opt.price_supplement
          if (opt.price_type === 'percent') return sideSum + basePrice * opt.price_supplement / 100
          return sideSum
        }, 0)
      }, 0)
    : 0

  // Surcharge délai sur le sous-total complet (base + finitions + côtés)
  const priceBeforeDelai = basePrice + finitionsPrice + sidesPrice
  const delaiSurcharge = selectedDelai?.surcharge_percent
    ? priceBeforeDelai * selectedDelai.surcharge_percent / 100
    : 0

  const unitPrice  = priceBeforeDelai + delaiSurcharge
  const totalPrice = unitPrice * quantity

  function handleAddToCart() {
    if (hasError) return
    addItem({ product_id: product.id, product, quantity, width_cm: isSurMesure ? width : selectedSize?.width_cm, height_cm: isSurMesure ? height : selectedSize?.height_cm, unit_price: unitPrice, total_price: totalPrice, selectedFinitions, selectedDelai, selectedSides } as any)
    setAdded(true); setTimeout(() => setAdded(false), 2500)
  }

  // ── Side helpers ──────────────────────────────────────────────────────
  const hasSides = sidesFinitions?.enabled && sidesFinitions.sides.length > 0 && sidesFinitions.options.length > 0
  const standardSides: any[] = hasSides ? sidesFinitions.sides.filter((s: any) => SIDE_POS[s.id]) : []
  const customSides:   any[] = hasSides ? sidesFinitions.sides.filter((s: any) => !SIDE_POS[s.id]) : []

  function getSideSelectedOpts(sideId: string): any[] {
    const ids = selectedSides[sideId] ?? []
    return sidesFinitions?.options.filter((o: any) => ids.includes(o.id)) ?? []
  }

  function getSideTotalPrice(sideId: string): string | null {
    const opts = getSideSelectedOpts(sideId)
    if (!opts.length) return null
    const pos = SIDE_POS[sideId]
    const isVert = pos === 'left' || pos === 'right'
    const lenM = isSurMesure
      ? (isVert ? height / 100 : width / 100)
      : (isVert ? (selectedSize?.height_cm ?? 100) / 100 : (selectedSize?.width_cm ?? 100) / 100)

    let total = 0
    for (const opt of opts) {
      if (!opt.price_supplement) continue
      if (opt.price_type === 'fixed')   total += opt.price_supplement
      if (opt.price_type === 'per_ml')  total += lenM * opt.price_supplement
      if (opt.price_type === 'percent') total += basePrice * opt.price_supplement / 100
    }
    return total > 0 ? `+${formatPrice(total)}` : null
  }

  // ── Side button component (inline) ───────────────────────────────────
  function SideBtn({ side, horiz, overrideId }: { side: any; horiz: boolean; overrideId?: string }) {
    const effectiveId = overrideId ?? side.id
    const pos      = SIDE_POS[side.id] ?? SIDE_POS[effectiveId]
    const icon     = sameAllSides ? '↔' : (SIDE_ICON[pos] ?? '')
    const isOpen   = openSide === effectiveId
    const selOpts  = getSideSelectedOpts(effectiveId)
    const price    = getSideTotalPrice(effectiveId)
    const noneSelected = selOpts.length === 0

    const displayLabel = noneSelected ? '— aucune —'
      : selOpts.length === 1 ? selOpts[0].label
      : selOpts.length === 2 ? selOpts.map((o: any) => o.label).join(', ')
      : `${selOpts[0].label} +${selOpts.length - 1} autre${selOpts.length > 2 ? 's' : ''}`

    if (horiz) {
      return (
        <button
          onClick={() => setOpenSide(isOpen ? null : effectiveId)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all
            ${isOpen
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
              : noneSelected
              ? 'bg-amber-50 border-amber-300 text-slate-700 hover:border-amber-400'
              : 'bg-white border-blue-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-wide opacity-60">{side.label}</span>
          </span>
          <span className={`text-sm font-bold truncate flex-1 text-center ${isOpen ? 'text-white' : noneSelected ? 'text-amber-600' : 'text-blue-700'}`}>
            {displayLabel}
          </span>
          {price && (
            <span className={`text-xs font-bold flex-shrink-0 ${isOpen ? 'text-blue-100' : 'text-blue-500'}`}>{price}</span>
          )}
          {isOpen
            ? <ChevronUp className="w-4 h-4 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-50" />
          }
        </button>
      )
    }

    // Vertical (gauche / droit)
    return (
      <button
        onClick={() => setOpenSide(isOpen ? null : effectiveId)}
        className={`flex flex-col items-center justify-center gap-1 px-2 py-3 w-full h-full min-h-[90px] rounded-xl border-2 transition-all
          ${isOpen
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
            : noneSelected
            ? 'bg-amber-50 border-amber-300 text-slate-700 hover:border-amber-400'
            : 'bg-white border-blue-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
          }`}
      >
        <span className="text-xl leading-none">{icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${isOpen ? 'text-blue-100' : 'text-slate-400'}`}>{side.label}</span>
        <span className={`text-xs font-bold text-center leading-tight ${isOpen ? 'text-white' : noneSelected ? 'text-amber-600' : 'text-blue-700'}`}>
          {displayLabel}
        </span>
        {price && (
          <span className={`text-[10px] font-bold ${isOpen ? 'text-blue-100' : 'text-blue-500'}`}>{price}</span>
        )}
      </button>
    )
  }

  // ── Option list for an open side ──────────────────────────────────────
  function SideOptions({ sideId }: { sideId: string }) {
    const side = sidesFinitions.sides.find((s: any) => s.id === sideId)
    if (!side) return null
    const pos = SIDE_POS[sideId]
    const isVert = pos === 'left' || pos === 'right'
    const lenM = isSurMesure
      ? (isVert ? height / 100 : width / 100)
      : (isVert ? (selectedSize?.height_cm ?? 100) / 100 : (selectedSize?.width_cm ?? 100) / 100)
    const lenCm = Math.round(lenM * 100)
    const incompatibilities: Array<[string, string]> = sidesFinitions.incompatibilities ?? []
    const currentSel: string[] = selectedSides[sideId] ?? []

    function getIncompatibleWith(optId: string): string[] {
      return incompatibilities
        .filter(([a, b]) => a === optId || b === optId)
        .map(([a, b]) => a === optId ? b : a)
    }

    return (
      <div className="mt-2 rounded-xl border-2 border-blue-400 overflow-hidden shadow-md">
        <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm font-bold text-white">{side.label} — choisissez vos finitions</p>
          <span className="text-xs text-blue-200 font-medium">{lenCm} cm</span>
        </div>
        <div className="bg-white divide-y divide-slate-100">
          {[...sidesFinitions.options]
            .sort((a: any, b: any) => {
              // Compatible options first, blocked ones at the bottom
              const aBlocked = !!getIncompatibleWith(a.id).find((id: string) => currentSel.includes(id))
              const bBlocked = !!getIncompatibleWith(b.id).find((id: string) => currentSel.includes(id))
              return Number(aBlocked) - Number(bBlocked)
            })
            .map((opt: any) => {
              const isSel = currentSel.includes(opt.id)
              const blocked = !isSel && !!getIncompatibleWith(opt.id).find((id: string) => currentSel.includes(id))

              const rawPrice = opt.price_supplement
                ? opt.price_type === 'fixed'  ? formatPrice(opt.price_supplement)
                : opt.price_type === 'per_ml' ? `${formatPrice(opt.price_supplement)}/ml → +${formatPrice(opt.price_supplement * lenM)}`
                :                               `${opt.price_supplement}%`
                : null

              return (
                <button key={opt.id}
                  onClick={() => toggleSideOption(sideId, opt.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 text-sm transition-colors text-left
                    ${isSel ? 'bg-blue-50' : blocked ? 'opacity-35 grayscale cursor-not-allowed' : 'hover:bg-slate-50'}`}
                >
                  {/* Checkbox */}
                  <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${isSel ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                    {isSel && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {/* Label */}
                  <span className={`flex-1 font-medium ${isSel ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</span>
                  {/* Price */}
                  <span className={`text-xs font-bold flex-shrink-0 ${isSel ? 'text-blue-600' : 'text-slate-400'}`}>
                    {rawPrice ? `+${rawPrice}` : <span className="text-green-600 font-semibold">Gratuit</span>}
                  </span>
                </button>
              )
            })}
        </div>
        {currentSel.length > 0 && (
          <div className="bg-blue-50 px-4 py-2 border-t border-blue-100 flex items-center justify-between">
            <span className="text-xs text-blue-600">
              {currentSel.length} option{currentSel.length > 1 ? 's' : ''} sélectionnée{currentSel.length > 1 ? 's' : ''}
            </span>
            {getSideTotalPrice(sideId) && (
              <span className="text-xs font-bold text-blue-700">{getSideTotalPrice(sideId)}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-700">Accueil</Link><span>/</span>
          <Link href="/catalogue" className="hover:text-slate-700">Catalogue</Link><span>/</span>
          <span className="text-slate-900 font-medium">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* ─── Galerie + Description ─── */}
          <div>
            <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] mb-3">
              {images.length > 0
                ? <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-slate-300">Pas d&apos;image</div>}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mb-5">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImage ? 'border-blue-500' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {product.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                <div className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>
            )}

            {/* ── Certificats ── */}
            {((product as any).certificates?.length > 0) && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Documents & certificats</p>
                <div className="space-y-2">
                  {((product as any).certificates as Array<{name: string; url: string; type: string}>).map((cert, i) => {
                    const typeLabel: Record<string, string> = { fire: 'Certificat feu', tech: 'Fiche technique', it: 'Certificat IT' }
                    const typeColor: Record<string, string> = { fire: 'bg-red-100 text-red-700', tech: 'bg-blue-100 text-blue-700', it: 'bg-green-100 text-green-700' }
                    return (
                      <a key={i} href={cert.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 truncate">{cert.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeColor[cert.type] ?? 'bg-slate-100 text-slate-500'}`}>
                            {typeLabel[cert.type] ?? cert.type}
                          </span>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Configurateur ─── */}
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[product.category] || product.category}
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{product.name}</h1>

            {/* ── Taille standard — liste de lignes ── */}
            {!isSurMesure && (product.standard_sizes?.length ?? 0) > 0 && (
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-700 mb-2">Choisissez une taille</p>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {(product.standard_sizes ?? []).map((size, idx) => {
                    const sizeKey = size.id ?? size.name ?? size.label ?? idx
                    const sizeName = size.name || size.label || `${size.width_cm}×${size.height_cm} cm`
                    const isSel = selectedSize
                      ? (selectedSize.id ? selectedSize.id === size.id : selectedSize.width_cm === size.width_cm && selectedSize.height_cm === size.height_cm)
                      : false
                    return (
                      <button
                        key={String(sizeKey)}
                        onClick={() => setSelectedSize(size)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${
                          isSel
                            ? 'bg-blue-600 border-l-4 border-l-blue-700'
                            : 'bg-white hover:bg-blue-50/50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSel ? 'border-white bg-white' : 'border-slate-300'}`}>
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isSel ? 'text-white' : 'text-slate-900'}`}>{sizeName}</p>
                            <p className={`text-xs ${isSel ? 'text-blue-100' : 'text-slate-400'}`}>{size.width_cm} × {size.height_cm} cm</p>
                          </div>
                        </div>
                        <p className={`text-sm font-black ${isSel ? 'text-white' : 'text-slate-700'}`}>{formatPrice(size.price)}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Sur mesure ── */}
            {isSurMesure && product.price_per_m2 && (
              <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-3">Configurez vos dimensions</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Largeur (cm) <span className="text-slate-400 font-normal">{minW}–{maxW} cm</span>
                    </label>
                    <input type="number" step="0.1" min={minW} max={maxW} value={width} onChange={e => setWidth(Number(e.target.value))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${widthError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`} />
                    {widthError && <p className="text-xs text-red-500 mt-1 font-medium">{widthError}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Hauteur (cm) <span className="text-slate-400 font-normal">{minH}–{maxH} cm</span>
                    </label>
                    <input type="number" step="0.1" min={minH} max={maxH} value={height} onChange={e => setHeight(Number(e.target.value))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${heightError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'}`} />
                    {heightError && <p className="text-xs text-red-500 mt-1 font-medium">{heightError}</p>}
                  </div>
                </div>

                {/* Dimension visual */}
                {!hasSides && (() => {
                  const maxBox = 200
                  const ratio  = width / height
                  let boxW: number, boxH: number
                  if (ratio >= 1) { boxW = maxBox; boxH = Math.max(50, Math.round(maxBox / ratio)) }
                  else            { boxH = maxBox; boxW = Math.max(50, Math.round(maxBox * ratio)) }
                  const padH = 26, padW = 64
                  const containerW = boxW + padW, containerH = boxH + padH
                  const rectLeft = padW / 2, rectTop = padH / 2
                  return (
                    <div className="flex flex-col items-center py-3 mb-3">
                      <div className="relative" style={{ width: containerW, height: containerH }}>
                        <div className="absolute flex items-center" style={{ top: rectTop - 18, left: rectLeft, width: boxW }}>
                          <div className="h-px bg-blue-300 flex-1" />
                          <span className="text-[11px] font-bold text-blue-500 px-1.5 whitespace-nowrap">{width} cm</span>
                          <div className="h-px bg-blue-300 flex-1" />
                        </div>
                        <div className="absolute flex flex-col items-center" style={{ left: rectLeft + boxW + 6, top: rectTop, height: boxH }}>
                          <div className="w-px bg-blue-300 flex-1" />
                          <span className="text-[11px] font-bold text-blue-500 py-1 whitespace-nowrap"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{height} cm</span>
                          <div className="w-px bg-blue-300 flex-1" />
                        </div>
                        <div className="absolute bg-blue-50 border-2 border-blue-400 rounded flex items-center justify-center"
                          style={{ left: rectLeft, top: rectTop, width: boxW, height: boxH }}>
                          <span className="text-[10px] font-semibold text-blue-400 text-center leading-tight">
                            {(width/100).toFixed(2)}m × {(height/100).toFixed(2)}m
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 -mt-1">Représentation proportionnelle</p>
                    </div>
                  )
                })()}

                <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200 pt-3">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Surface : <strong className="text-slate-700">{surfaceM2.toFixed(2)} m²</strong> · {formatPrice(product.price_per_m2)} / m²</span>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ─── FINITIONS PAR CÔTÉ — section bien visible ───────────
                ═══════════════════════════════════════════════════════════ */}
            {hasSides && (
              <div className="mb-6" ref={sidesRef}>
                {/* Explanatory banner + toggle */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-xl flex-shrink-0">📐</span>
                    <div>
                      <p className="text-sm font-bold text-blue-800">Finitions par côté</p>
                      <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                        Sélectionnez une ou plusieurs finitions pour chaque côté en cliquant dessus.
                        Certaines options sont incompatibles entre elles.
                      </p>
                    </div>
                  </div>
                  {/* Same-all-sides toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative flex-shrink-0">
                      <input type="checkbox" className="sr-only" checked={sameAllSides} onChange={e => handleSameAllSides(e.target.checked)} />
                      <div className={`w-10 h-5 rounded-full transition-colors ${sameAllSides ? 'bg-blue-600' : 'bg-slate-300 group-hover:bg-slate-400'}`} />
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sameAllSides ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className={`text-xs font-semibold ${sameAllSides ? 'text-blue-800' : 'text-blue-700'}`}>
                      Même finition pour les {sidesFinitions.sides.length} côtés
                    </span>
                    {sameAllSides && (
                      <span className="text-[10px] text-blue-500 font-medium bg-blue-100 px-2 py-0.5 rounded-full">Actif</span>
                    )}
                  </label>
                </div>
                {sidesPrice > 0 && (
                  <div className="flex justify-end mb-3">
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                      Finitions côtés : +{formatPrice(sidesPrice)}
                    </span>
                  </div>
                )}

                {/* ── Cross grid or single "all sides" button ── */}
                {standardSides.length > 0 && (() => {
                  const sideAt = (p: 'top'|'bottom'|'left'|'right') =>
                    standardSides.find((s: any) => SIDE_POS[s.id] === p)

                  const top    = sideAt('top')
                  const bottom = sideAt('bottom')
                  const left   = sideAt('left')
                  const right  = sideAt('right')

                  // Center block dimensions
                  const maxBox = 120
                  const ratio  = isSurMesure ? width / height : (selectedSize ? selectedSize.width_cm / selectedSize.height_cm : 2)
                  let boxW: number, boxH: number
                  if (ratio >= 1) { boxW = maxBox; boxH = Math.max(40, Math.round(maxBox / ratio)) }
                  else            { boxH = maxBox; boxW = Math.max(40, Math.round(maxBox * ratio)) }

                  // ── Mode "même finition pour tous" ──
                  if (sameAllSides) {
                    const refSide = sidesFinitions.sides[0]
                    const allSidesLabel = sidesFinitions.sides.map((s: any) => s.label).join(' · ')
                    const fakeSide = { ...refSide, label: allSidesLabel }
                    return (
                      <div>
                        <SideBtn side={fakeSide} horiz overrideId={refSide.id} />
                        {openSide === refSide.id && <SideOptions sideId={refSide.id} />}
                      </div>
                    )
                  }

                  // ── Mode individuel (grille croisée) ──
                  return (
                    <div className="space-y-2">
                      {top && (
                        <div>
                          <SideBtn side={top} horiz />
                          {openSide === top.id && <SideOptions sideId={top.id} />}
                        </div>
                      )}

                      <div className="grid gap-2" style={{ gridTemplateColumns: left || right ? '72px 1fr 72px' : '1fr' }}>
                        {left
                          ? <div><SideBtn side={left} horiz={false} /></div>
                          : <div className="w-[72px]" />
                        }

                        {/* Centre — mini visuel */}
                        <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed min-h-[90px] py-3 px-2
                          ${openSide ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="relative mb-2">
                            <div className="bg-white border-2 border-blue-300 rounded flex items-center justify-center"
                              style={{ width: boxW, height: boxH }}>
                              <span className="text-[9px] font-semibold text-blue-400 text-center leading-tight px-1">
                                {isSurMesure
                                  ? `${(width/100).toFixed(2)}m × ${(height/100).toFixed(2)}m`
                                  : selectedSize ? `${selectedSize.label}` : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 text-center">
                            {isSurMesure
                              ? `${width} × ${height} cm`
                              : selectedSize ? `${selectedSize.width_cm} × ${selectedSize.height_cm} cm` : ''}
                          </p>
                        </div>

                        {right
                          ? <div><SideBtn side={right} horiz={false} /></div>
                          : <div className="w-[72px]" />
                        }
                      </div>

                      {openSide && (openSide === left?.id || openSide === right?.id) && (
                        <SideOptions sideId={openSide} />
                      )}

                      {bottom && (
                        <div>
                          <SideBtn side={bottom} horiz />
                          {openSide === bottom.id && <SideOptions sideId={bottom.id} />}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Custom sides (non-standard positions) */}
                {customSides.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {customSides.map((side: any) => {
                      const selOpts = getSideSelectedOpts(side.id)
                      const displayLabel = selOpts.length === 0 ? '— aucune —'
                        : selOpts.length === 1 ? selOpts[0].label
                        : selOpts.length === 2 ? selOpts.map((o: any) => o.label).join(', ')
                        : `${selOpts[0].label} +${selOpts.length - 1} autre${selOpts.length > 2 ? 's' : ''}`
                      return (
                        <div key={side.id}>
                          <button
                            onClick={() => setOpenSide(openSide === side.id ? null : side.id)}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all
                              ${openSide === side.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-blue-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'}`}
                          >
                            <span className="text-sm font-bold">{side.label}</span>
                            <span className={`text-sm ${openSide === side.id ? 'text-white' : 'text-blue-700'}`}>{displayLabel}</span>
                            <span className={`text-xs font-bold ${openSide === side.id ? 'text-blue-100' : 'text-blue-500'}`}>{getSideTotalPrice(side.id) ?? ''}</span>
                            {openSide === side.id ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-50" />}
                          </button>
                          {openSide === side.id && <SideOptions sideId={side.id} />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── Finition groups ─── */}
            {finitionGroups.length > 0 && (
              <div className="mb-6 space-y-4">
                {finitionGroups.map(group => {
                  const sel = selectedFinitions[group.id]
                  return (
                    <div key={group.id}>
                      {group.label && <p className="text-sm font-bold text-slate-700 mb-2">{group.label}</p>}

                      {group.display_type === 'select' && (
                        <div className="relative">
                          <select value={(sel as string) ?? ''} onChange={e => setSelectedFinitions(p => ({ ...p, [group.id]: e.target.value }))}
                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-9">
                            {!group.required && <option value="">— Aucune sélection —</option>}
                            {group.options.map(opt => {
                              const price = opt.price_supplement > 0
                                ? opt.price_type === 'fixed' ? ` (+${formatPrice(opt.price_supplement)})` : opt.price_type === 'percent' ? ` (+${opt.price_supplement}%)` : ` (+${formatPrice(opt.price_supplement)}/m²)` : ''
                              return <option key={opt.id} value={opt.id}>{opt.label}{price}</option>
                            })}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      )}

                      {group.display_type === 'checkbox' && (
                        <div className="space-y-2">
                          {group.options.map(opt => {
                            const isSel = Array.isArray(sel) && sel.includes(opt.id)
                            const supplement = opt.price_supplement > 0
                              ? opt.price_type === 'fixed' ? `+${formatPrice(opt.price_supplement)}` : opt.price_type === 'percent' ? `+${opt.price_supplement}%` : `+${formatPrice(opt.price_supplement)}/m²` : null
                            return (
                              <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
                                <input type="checkbox" checked={isSel} onChange={() => toggleCheckbox(group.id, opt.id)} className="w-4 h-4 accent-blue-600" />
                                <span className="flex-1 text-sm font-medium text-slate-700">{opt.label}</span>
                                {supplement && <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{supplement}</span>}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {finitionsPrice > 0 && (
                  <p className="text-xs text-slate-500 pt-1">Options : <strong className="text-slate-700">+{formatPrice(finitionsPrice)}</strong></p>
                )}
              </div>
            )}

            {/* ─── Délai de production — timeline ─── */}
            {delais.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-700 mb-4">Délai de production</p>

                {/* Timeline */}
                <div className="relative">
                  {/* Ligne de fond */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 z-0" />
                  {/* Ligne de progression jusqu'au délai sélectionné */}
                  {selectedDelai && (() => {
                    const sorted = [...delais].sort((a: any, b: any) => a.days - b.days)
                    const idx = sorted.findIndex((d: any) => d.id === selectedDelai?.id)
                    const pct = delais.length > 1 ? (idx / (sorted.length - 1)) * 100 : 100
                    return (
                      <div className="absolute top-5 left-5 h-0.5 bg-blue-400 z-0 transition-all duration-300"
                        style={{ width: `calc((100% - 40px) * ${pct / 100})` }} />
                    )
                  })()}

                  <div className="flex justify-between relative z-10">
                    {[...delais].sort((a: any, b: any) => a.days - b.days).map((d: any) => {
                      const isSel = selectedDelai?.id === d.id
                      const pct = d.surcharge_percent || 0
                      const prodDate   = addWorkingDays(d.days)
                      const stdDate    = addWorkingDays(d.days + 2)
                      const fmtShort   = (dt: Date) => dt.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })
                      return (
                        <button key={d.id} onClick={() => setSelectedDelai(d)}
                          className={`flex flex-col items-center gap-1 group min-w-0 rounded-xl px-1 py-1.5 transition-all ${isSel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          {/* Point sur la timeline */}
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSel ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-300 group-hover:border-blue-400'
                          }`}>
                            <span className={`text-xs font-black ${isSel ? 'text-white' : 'text-slate-500'}`}>{d.days}j</span>
                          </div>

                          {/* Badge surcharge */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            pct === 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            pct <= 20 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            'bg-red-50 text-red-500 border border-red-200'
                          }`}>{pct === 0 ? 'Std' : `+${pct}%`}</span>

                          {/* 3 dates de livraison sous la vignette */}
                          <div className={`mt-1 space-y-0.5 text-center ${isSel ? '' : 'opacity-60'}`}>
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-[9px]">🏭</span>
                              <span className={`text-[9px] font-semibold ${isSel ? 'text-blue-700' : 'text-slate-500'}`}>{fmtShort(prodDate)}</span>
                            </div>
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-[9px]">📦</span>
                              <span className={`text-[9px] font-semibold ${isSel ? 'text-slate-700' : 'text-slate-400'}`}>{fmtShort(stdDate)}</span>
                            </div>
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-[9px]">⚡</span>
                              <span className={`text-[9px] font-semibold ${isSel ? 'text-orange-600' : 'text-slate-400'}`}>{fmtShort(prodDate)}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Quantité + Prix ─── */}
            <div className="flex items-center gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Quantité</label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 text-slate-600 hover:bg-slate-50 text-lg font-bold leading-none">−</button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v) && v >= 1) setQuantity(v)
                      else if (e.target.value === '') setQuantity(1)
                    }}
                    onBlur={e => { if (!e.target.value || parseInt(e.target.value) < 1) setQuantity(1) }}
                    className="w-14 py-2 text-sm font-bold border-x border-slate-200 text-center focus:outline-none focus:bg-blue-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-2 text-slate-600 hover:bg-slate-50 text-lg font-bold leading-none">+</button>
                </div>
              </div>
              {unitPrice > 0 && (
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Prix total estimé</p>
                  <p className="text-2xl font-extrabold text-blue-600">{formatPrice(totalPrice)}<span className="text-xs font-normal text-slate-400 ml-1">HTVA</span></p>
                  {quantity > 1 && <p className="text-xs text-slate-400">{formatPrice(unitPrice)} / unité</p>}
                </div>
              )}
            </div>

            {/* ─── VAT Breakdown ─── */}
            {unitPrice > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Prix HTVA</span>
                  <span className="font-semibold">{formatPrice(unitPrice)} × {quantity}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>TVA {vatRate}%</span>
                  <span>{formatPrice(calcVAT(unitPrice * quantity, vatRate))}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                  <span>Total TTC</span>
                  <span className="text-blue-600">{formatPrice(calcTTC(unitPrice * quantity, vatRate))}</span>
                </div>
              </div>
            )}

            {/* ─── CTA ─── */}
            <div className="mb-6">
              <button onClick={handleAddToCart} disabled={hasError}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                {added ? <><CheckCircle className="w-4 h-4" /> Ajouté au panier !</> : <><ShoppingCart className="w-4 h-4" /> Ajouter au panier</>}
              </button>
            </div>

            {/* Légende livraison — compacte */}
            <div className="flex items-center gap-3 mb-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span>🏭</span> Enlèvement</span>
              <span className="flex items-center gap-1"><span>📦</span> Standard +2j</span>
              <span className="flex items-center gap-1"><span>⚡</span> Express même jour</span>
            </div>

            {/* ─── Réassurance ─── */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle className="w-3 h-3 text-green-500" /> Production locale à Liège</p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle className="w-3 h-3 text-green-500" /> Paiement sécurisé Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
