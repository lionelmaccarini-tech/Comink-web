'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, FileText, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false })

const CATEGORIES = [
  { value: 'banderoles', label: 'Banderoles' },
  { value: 'baches', label: 'Bâches' },
  { value: 'roll_up', label: 'Roll-up' },
  { value: 'adhesifs', label: 'Adhésifs' },
  { value: 'drapeaux', label: 'Drapeaux' },
  { value: 'panneaux', label: 'Panneaux' },
  { value: 'toiles', label: 'Toiles' },
  { value: 'vinyle_autocollant', label: 'Vinyle autocollant' },
  { value: 'supports_evenementiels', label: 'Supports évènementiels' },
  { value: 'textile', label: 'Textile' },
  { value: 'papier', label: 'Papier' },
  { value: 'accessoires', label: 'Accessoires' },
]

interface StandardSize {
  id: string
  name: string
  width_cm: number
  height_cm: number
  price: number
}

// ── Finitions ──────────────────────────────────────────────────────────────
interface FinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'percent' | 'per_m2'
  price_supplement: number
  default_selected: boolean
}

interface FinitionGroup {
  id: string
  label: string                      // nom du groupe ex: "Qualité d'impression"
  display_type: 'checkbox' | 'select'
  required: boolean
  options: FinitionOption[]
}

interface DelaiOption {
  id: string
  label: string
  days: number
  surcharge_percent: number
}

interface Certificate {
  name: string
  url: string
  type: 'fire' | 'tech' | 'it'
}

interface SideFinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'per_ml' | 'percent'
  price_supplement: number
}

interface SidesFinitions {
  enabled: boolean
  sides: Array<{ id: string; label: string }>
  options: SideFinitionOption[]
  incompatibilities: Array<[string, string]>
}

interface ProductForm {
  name: string
  production_code: string
  category: string
  description: string
  product_type: 'sur_mesure' | 'taille_standard'
  image_url: string
  images: string[]
  available: boolean
  vat_rate: number
  certificates: Certificate[]
  restricted_to_price_lists: string[]
  // Sur mesure
  price_per_m2: number | ''
  min_width_cm: number | ''
  max_width_cm: number | ''
  min_height_cm: number | ''
  max_height_cm: number | ''
  // Standard
  standard_sizes: StandardSize[]
  // Options
  finition_groups: FinitionGroup[]
  delai_options: DelaiOption[]
  // Finitions par côté
  sides_finitions: SidesFinitions | null
  // SEO
  seo_title: string
  seo_description: string
  seo_keywords: string
}

function uid() { return crypto.randomUUID() }

function generateProductionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans O, 0, I, 1 pour éviter confusions
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function emptyOption(): FinitionOption {
  return { id: uid(), label: '', price_type: 'fixed', price_supplement: 0, default_selected: false }
}

function emptyGroup(): FinitionGroup {
  return { id: uid(), label: '', display_type: 'checkbox', required: false, options: [emptyOption()] }
}

const emptyForm = (): ProductForm => ({
  name: '',
  production_code: generateProductionCode(),
  category: 'banderoles',
  description: '',
  product_type: 'sur_mesure',
  image_url: '',
  images: [],
  available: true,
  vat_rate: 21,
  certificates: [],
  restricted_to_price_lists: [],
  price_per_m2: '',
  min_width_cm: '',
  max_width_cm: '',
  min_height_cm: '',
  max_height_cm: '',
  standard_sizes: [],
  finition_groups: [],
  sides_finitions: null,
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  delai_options: [
    { id: uid(), label: 'Standard (5-7 jours ouvrables)', days: 7, surcharge_percent: 0 },
    { id: uid(), label: 'Express (2-3 jours ouvrables)', days: 3, surcharge_percent: 30 },
    { id: uid(), label: 'Urgent (24-48h)', days: 1, surcharge_percent: 60 },
  ],
})

/** Convert old flat finitions format to new grouped format */
function normalizeFinitions(raw: any[]): FinitionGroup[] {
  if (!raw || raw.length === 0) return []
  // New format already has `options` array
  if (raw[0]?.options !== undefined) return raw as FinitionGroup[]
  // Old format: each finition → its own group with one option
  return raw.map((f: any) => ({
    id: f.id ?? uid(),
    label: f.name ?? '',
    display_type: (f.display_type === 'select' ? 'select' : 'checkbox') as 'checkbox' | 'select',
    required: false,
    options: [{
      id: uid(),
      label: f.name ?? '',
      price_type: (f.price_type ?? 'fixed') as 'fixed' | 'percent' | 'per_m2',
      price_supplement: f.price_supplement ?? 0,
      default_selected: f.default_selected ?? false,
    }],
  }))
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const smallInputCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

interface Props {
  product?: any
  onClose: () => void
  onSaved: (p: any) => void
  categories?: Array<{ id: string; label: string; active: boolean }>
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/r2-upload', { method: 'POST', body: formData })
  const data = await res.json()
  return data.url
}

export default function ProductModal({ product, onClose, onSaved, categories: categoriesProp }: Props) {
  // Merge dynamic categories with built-in fallback (for backward compat)
  const categoriesList = (categoriesProp && categoriesProp.length > 0)
    ? categoriesProp.filter(c => c.active || c.id === product?.category)
    : CATEGORIES.map(c => ({ id: c.value, label: c.label, active: true }))
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [section, setSection] = useState<'general' | 'dimensions' | 'finitions' | 'delais' | 'images' | 'certificats' | 'seo'>('general')

  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const mainImageRef  = useRef<HTMLInputElement>(null)
  const extraImageRef = useRef<HTMLInputElement>(null)
  const certFileRef   = useRef<HTMLInputElement>(null)

  const [newCertName, setNewCertName] = useState('')
  const [newCertType, setNewCertType] = useState<'fire' | 'tech' | 'it'>('fire')
  const [showCertForm, setShowCertForm] = useState(false)

  const [priceLists, setPriceLists] = useState<any[]>([])
  const [visibleByAll, setVisibleByAll] = useState(true)

  useEffect(() => {
    if (product) {
      const restricted = product.restricted_to_price_lists ?? []
      setVisibleByAll(restricted.length === 0)
      setForm({
        name: product.name ?? '',
        production_code: product.production_code ?? generateProductionCode(),
        category: product.category ?? 'banderoles',
        description: product.description ?? '',
        product_type: product.product_type ?? 'sur_mesure',
        image_url: product.image_url ?? '',
        // Exclude main image from extra images to avoid duplication on re-save
        images: (product.images ?? []).filter((url: string) => url !== product.image_url),
        available: product.available ?? true,
        vat_rate: product.vat_rate ?? 21,
        certificates: product.certificates ?? [],
        restricted_to_price_lists: restricted,
        price_per_m2: product.price_per_m2 ?? '',
        min_width_cm: product.min_width_cm ?? '',
        max_width_cm: product.max_width_cm ?? '',
        min_height_cm: product.min_height_cm ?? '',
        max_height_cm: product.max_height_cm ?? '',
        standard_sizes: product.standard_sizes ?? [],
        finition_groups: normalizeFinitions(product.finitions ?? []),
        sides_finitions: product.sides_finitions ?? null,
        delai_options: product.delai_options?.length ? product.delai_options : emptyForm().delai_options,
        seo_title:       (product as any).seo_title ?? '',
        seo_description: (product as any).seo_description ?? '',
        seo_keywords:    (product as any).seo_keywords ?? '',
      })
    }
  }, [product])

  useEffect(() => {
    fetch('/api/admin/price-lists')
      .then(r => r.json())
      .then(d => setPriceLists(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const set = (key: keyof ProductForm, value: any) => setForm(f => ({ ...f, [key]: value }))

  async function handleMainImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingMain(true)
    try { set('image_url', await uploadFile(file)) } finally { setUploadingMain(false) }
  }

  async function handleExtraImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingExtra(true)
    try { set('images', [...form.images, await uploadFile(file)]) } finally { setUploadingExtra(false) }
  }

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !newCertName.trim()) return
    setUploadingCert(true)
    try {
      const url = await uploadFile(file)
      set('certificates', [...form.certificates, { name: newCertName.trim(), url, type: newCertType }])
      setNewCertName(''); setNewCertType('fire'); setShowCertForm(false)
    } finally { setUploadingCert(false) }
  }

  function removeCert(idx: number) { set('certificates', form.certificates.filter((_: any, i: number) => i !== idx)) }
  function removeExtraImage(idx: number) { set('images', form.images.filter((_: string, i: number) => i !== idx)) }
  function togglePriceList(id: string) {
    const cur = form.restricted_to_price_lists
    set('restricted_to_price_lists', cur.includes(id) ? cur.filter((x: string) => x !== id) : [...cur, id])
  }

  const CERT_TYPE_LABELS: Record<string, string> = { fire: 'Certificat feu', tech: 'Fiche technique', it: 'Fiche informative' }
  const CERT_TYPE_COLORS: Record<string, string> = { fire: 'bg-red-100 text-red-700', tech: 'bg-blue-100 text-blue-700', it: 'bg-green-100 text-green-700' }

  // Standard sizes
  const addSize = () => set('standard_sizes', [...form.standard_sizes, { id: uid(), name: '', width_cm: 0, height_cm: 0, price: 0 }])
  const updateSize = (id: string, key: keyof StandardSize, val: any) =>
    set('standard_sizes', form.standard_sizes.map(s => s.id === id ? { ...s, [key]: val } : s))
  const removeSize = (id: string) => set('standard_sizes', form.standard_sizes.filter(s => s.id !== id))

  // ── Finition groups ────────────────────────────────────────────────────────
  const addGroup = () => set('finition_groups', [...form.finition_groups, emptyGroup()])

  const updateGroup = (gid: string, key: keyof FinitionGroup, val: any) =>
    set('finition_groups', form.finition_groups.map(g => g.id === gid ? { ...g, [key]: val } : g))

  const removeGroup = (gid: string) =>
    set('finition_groups', form.finition_groups.filter(g => g.id !== gid))

  const moveGroup = (gid: string, dir: -1 | 1) => {
    const arr = [...form.finition_groups]
    const idx = arr.findIndex(g => g.id === gid)
    const next = idx + dir
    if (next < 0 || next >= arr.length) return
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    set('finition_groups', arr)
  }

  const addOption = (gid: string) =>
    set('finition_groups', form.finition_groups.map(g =>
      g.id === gid ? { ...g, options: [...g.options, emptyOption()] } : g
    ))

  const updateOption = (gid: string, oid: string, key: keyof FinitionOption, val: any) =>
    set('finition_groups', form.finition_groups.map(g =>
      g.id === gid
        ? { ...g, options: g.options.map(o => o.id === oid ? { ...o, [key]: val } : o) }
        : g
    ))

  const removeOption = (gid: string, oid: string) =>
    set('finition_groups', form.finition_groups.map(g =>
      g.id === gid ? { ...g, options: g.options.filter(o => o.id !== oid) } : g
    ))

  // Délais
  const addDelai = () => set('delai_options', [...form.delai_options, { id: uid(), label: '', days: 5, surcharge_percent: 0 }])
  const updateDelai = (id: string, key: keyof DelaiOption, val: any) =>
    set('delai_options', form.delai_options.map(d => d.id === id ? { ...d, [key]: val } : d))
  const removeDelai = (id: string) => set('delai_options', form.delai_options.filter(d => d.id !== id))

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    if (!form.category)    { setError('La catégorie est obligatoire'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...(product?.id ? { id: product.id } : {}),
        name: form.name.trim(),
        production_code: form.production_code.trim().toUpperCase() || generateProductionCode(),
        category: form.category,
        description: form.description,
        product_type: form.product_type,
        image_url: form.image_url || null,
        images: form.image_url ? [form.image_url, ...form.images.filter(Boolean)] : form.images.filter(Boolean),
        available: form.available,
        vat_rate: form.vat_rate,
        certificates: form.certificates,
        restricted_to_price_lists: visibleByAll ? [] : form.restricted_to_price_lists,
        price_per_m2: form.product_type === 'sur_mesure' && form.price_per_m2 !== '' ? Number(form.price_per_m2) : null,
        min_width_cm:  form.min_width_cm  !== '' ? Number(form.min_width_cm)  : null,
        max_width_cm:  form.max_width_cm  !== '' ? Number(form.max_width_cm)  : null,
        min_height_cm: form.min_height_cm !== '' ? Number(form.min_height_cm) : null,
        max_height_cm: form.max_height_cm !== '' ? Number(form.max_height_cm) : null,
        standard_sizes: form.product_type === 'taille_standard' ? form.standard_sizes : [],
        finitions: form.finition_groups,   // stored as `finitions` in DB
        sides_finitions: form.sides_finitions,
        delai_options: form.delai_options,
        seo_title:       form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        seo_keywords:    form.seo_keywords.trim() || null,
      }
      const method = product?.id ? 'PUT' : 'POST'
      const res  = await fetch('/api/admin/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur serveur')
      onSaved(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalOptions = form.finition_groups.reduce((n, g) => n + g.options.length, 0)

  const tabs = [
    { id: 'general',     label: 'Général' },
    { id: 'dimensions',  label: form.product_type === 'sur_mesure' ? 'Sur mesure' : 'Tailles standard' },
    { id: 'finitions',   label: `Finitions${totalOptions ? ` (${totalOptions})` : ''}` },
    { id: 'delais',      label: `Délais${form.delai_options.length ? ` (${form.delai_options.length})` : ''}` },
    { id: 'images',      label: `Images${form.image_url || form.images.length ? ` (${(form.image_url ? 1 : 0) + form.images.filter(Boolean).length})` : ''}` },
    { id: 'certificats', label: `Certificats${form.certificates.length ? ` (${form.certificates.length})` : ''}` },
    { id: 'seo',         label: `SEO${form.seo_title || form.seo_description ? ' ✓' : ''}` },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2>
            {form.name && <p className="text-xs text-slate-400 mt-0.5">{form.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
              <div onClick={() => set('available', !form.available)}
                className={cn('relative w-10 h-5 rounded-full transition-colors', form.available ? 'bg-green-500' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', form.available ? 'translate-x-5' : 'translate-x-0.5')} />
              </div>
              {form.available ? 'Disponible' : 'Masqué'}
            </label>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSection(t.id as any)}
              className={cn('px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap', section === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ─── GÉNÉRAL ─── */}
          {section === 'general' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Nom du produit *">
                    <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Banderole PVC 510g" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Code production" hint="Code à 6 caractères alphanumériques unique par produit — affiché sur les fiches de production.">
                    <div className="flex gap-2">
                      <input
                        className={cn(inputCls, 'font-mono text-base tracking-widest uppercase flex-1')}
                        value={form.production_code}
                        onChange={e => set('production_code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                        placeholder="EX: AB3K7Z"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => set('production_code', generateProductionCode())}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        title="Générer un nouveau code aléatoire"
                      >
                        🔀 Générer
                      </button>
                    </div>
                    {form.production_code.length > 0 && form.production_code.length < 6 && (
                      <p className="text-[11px] text-amber-600 mt-0.5">{6 - form.production_code.length} caractère{6 - form.production_code.length > 1 ? 's' : ''} manquant{6 - form.production_code.length > 1 ? 's' : ''}</p>
                    )}
                  </Field>
                </div>
                <Field label="Catégorie *">
                  <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                    {categoriesList.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Type de produit *">
                  <select className={inputCls} value={form.product_type} onChange={e => set('product_type', e.target.value as any)}>
                    <option value="sur_mesure">Sur mesure</option>
                    <option value="taille_standard">Taille standard</option>
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <RichTextEditor
                  value={form.description}
                  onChange={val => set('description', val)}
                  placeholder="Description du produit, matériaux, usages…"
                />
              </Field>

              <Field label="Taux de TVA">
                <div className="flex gap-2">
                  {[0, 6, 12, 21].map(rate => (
                    <button key={rate} type="button"
                      onClick={() => setForm(f => ({ ...f, vat_rate: rate }))}
                      className={cn('px-3 py-1.5 rounded-lg border text-sm font-bold transition-all',
                        form.vat_rate === rate
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-blue-300'
                      )}>
                      {rate}%
                    </button>
                  ))}
                </div>
              </Field>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200" onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-blue-700">{form.image_url ? 'Image principale définie' : 'Aucune image principale'}</p>
                    <p className="text-[11px] text-blue-500">{(form.image_url ? 1 : 0) + form.images.filter(Boolean).length} image{((form.image_url ? 1 : 0) + form.images.filter(Boolean).length) > 1 ? 's' : ''} au total</p>
                  </div>
                </div>
                <button onClick={() => setSection('images')} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
                  Gérer les images →
                </button>
              </div>

              {/* Visibilité */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-600">Visibilité</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Produit visible par tous</p>
                    <p className="text-xs text-slate-400">Si désactivé, seuls les clients avec les listes sélectionnées verront ce produit</p>
                  </div>
                  <div onClick={() => setVisibleByAll(v => !v)}
                    className={cn('relative w-10 h-5 rounded-full cursor-pointer transition-colors', visibleByAll ? 'bg-green-500' : 'bg-slate-300')}>
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', visibleByAll ? 'translate-x-5' : 'translate-x-0.5')} />
                  </div>
                </div>
                {!visibleByAll && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-slate-500">Listes de prix autorisées :</p>
                    {priceLists.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucune liste de prix disponible.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {priceLists.map(pl => (
                          <label key={pl.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={form.restricted_to_price_lists.includes(pl.id)} onChange={() => togglePriceList(pl.id)} className="accent-blue-600" />
                            <span className="font-medium text-slate-700">{pl.name}</span>
                            {pl.description && <span className="text-xs text-slate-400">{pl.description}</span>}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── DIMENSIONS ─── */}
          {section === 'dimensions' && form.product_type === 'sur_mesure' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-3">Tarification au m²</p>
                <Field label="Prix par m² (€)" hint="Entrer avec 2 décimales, ex: 8.50">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    <input type="number" step="0.01" min="0" className={inputCls} value={form.price_per_m2} onChange={e => set('price_per_m2', e.target.value)} placeholder="0.00" />
                    <span className="text-sm text-slate-500 font-semibold">€/m²</span>
                  </div>
                </Field>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-600">Dimensions autorisées (précision 0,1 cm)</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Largeur min (cm)"><input type="number" step="0.1" min="0" className={inputCls} value={form.min_width_cm} onChange={e => set('min_width_cm', e.target.value)} placeholder="ex: 20" /></Field>
                  <Field label="Largeur max (cm)"><input type="number" step="0.1" min="0" className={inputCls} value={form.max_width_cm} onChange={e => set('max_width_cm', e.target.value)} placeholder="ex: 500" /></Field>
                  <Field label="Hauteur min (cm)"><input type="number" step="0.1" min="0" className={inputCls} value={form.min_height_cm} onChange={e => set('min_height_cm', e.target.value)} placeholder="ex: 20" /></Field>
                  <Field label="Hauteur max (cm)"><input type="number" step="0.1" min="0" className={inputCls} value={form.max_height_cm} onChange={e => set('max_height_cm', e.target.value)} placeholder="ex: 300" /></Field>
                </div>
              </div>
            </>
          )}

          {section === 'dimensions' && form.product_type === 'taille_standard' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Tailles disponibles</p>
                <button onClick={addSize} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Ajouter une taille
                </button>
              </div>
              {form.standard_sizes.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">Aucune taille.</div>
              )}
              {form.standard_sizes.map((s, i) => (
                <div key={s.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">Taille #{i + 1}</span>
                    <button onClick={() => removeSize(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-4 sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Nom</label>
                      <input className={smallInputCls + ' w-full'} value={s.name} onChange={e => updateSize(s.id, 'name', e.target.value)} placeholder="A0, 100x50..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Larg. (cm)</label>
                      <input type="number" step="0.1" min="0" className={smallInputCls + ' w-full'} value={s.width_cm || ''} onChange={e => updateSize(s.id, 'width_cm', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Haut. (cm)</label>
                      <input type="number" step="0.1" min="0" className={smallInputCls + ' w-full'} value={s.height_cm || ''} onChange={e => updateSize(s.id, 'height_cm', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Prix (€)</label>
                      <input type="number" step="0.01" min="0" className={smallInputCls + ' w-full'} value={s.price || ''} onChange={e => updateSize(s.id, 'price', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── FINITIONS ─── */}
          {section === 'finitions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Groupes de finitions</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Chaque groupe peut être affiché en cases à cocher ou en menu déroulant.</p>
                </div>
                <button onClick={addGroup} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un groupe
                </button>
              </div>

              {form.finition_groups.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Aucune finition. Cliquez sur "Ajouter un groupe".
                </div>
              )}

              {form.finition_groups.map((group, gi) => (
                <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="bg-slate-50 px-3 py-2.5 flex items-center gap-3">
                    {/* Display type toggle */}
                    <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-[11px] font-semibold flex-shrink-0">
                      <button type="button"
                        onClick={() => updateGroup(group.id, 'display_type', 'checkbox')}
                        className={cn('px-2.5 py-1.5 transition-colors', group.display_type === 'checkbox' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
                        title="Cases à cocher (multi-sélection)">
                        ☑ Cases
                      </button>
                      <button type="button"
                        onClick={() => updateGroup(group.id, 'display_type', 'select')}
                        className={cn('px-2.5 py-1.5 border-l border-slate-200 transition-colors', group.display_type === 'select' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
                        title="Menu déroulant (choix unique)">
                        ▼ Menu
                      </button>
                    </div>
                    {/* Group label */}
                    <input
                      className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 min-w-0"
                      value={group.label}
                      onChange={e => updateGroup(group.id, 'label', e.target.value)}
                      placeholder={group.display_type === 'select' ? 'Nom du menu (ex: Qualité d\'impression)' : 'Nom du groupe (ex: Options supplémentaires)'}
                    />
                    {/* Required toggle */}
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={group.required} onChange={e => updateGroup(group.id, 'required', e.target.checked)} className="accent-blue-600" />
                      Obligatoire
                    </label>
                    {/* Reorder group */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button type="button" onClick={() => moveGroup(group.id, -1)} disabled={gi === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Monter">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveGroup(group.id, 1)} disabled={gi === form.finition_groups.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Descendre">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Remove group */}
                    <button onClick={() => removeGroup(group.id)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="p-3 space-y-2">
                    {group.options.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-1">Aucune option — ajoutez-en une ci-dessous.</p>
                    )}

                    {/* Column headers */}
                    {group.options.length > 0 && (
                      <div className="grid grid-cols-12 gap-2 px-1">
                        <div className="col-span-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label de l'option</div>
                        <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type prix</div>
                        <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant</div>
                        <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Déf.</div>
                        <div className="col-span-1" />
                      </div>
                    )}

                    {group.options.map((opt) => (
                      <div key={opt.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                        {/* Label */}
                        <div className="col-span-5">
                          <input
                            className={smallInputCls + ' w-full'}
                            value={opt.label}
                            onChange={e => updateOption(group.id, opt.id, 'label', e.target.value)}
                            placeholder={group.display_type === 'select' ? 'Standard, Premium…' : 'Œillets, Ourlet…'}
                          />
                        </div>
                        {/* Price type */}
                        <div className="col-span-3">
                          <select
                            className={smallInputCls + ' w-full'}
                            value={opt.price_type}
                            onChange={e => updateOption(group.id, opt.id, 'price_type', e.target.value)}>
                            <option value="fixed">€ fixe</option>
                            <option value="percent">% prix base</option>
                            <option value="per_m2">€ / m²</option>
                          </select>
                        </div>
                        {/* Price value */}
                        <div className="col-span-2">
                          <input
                            type="number" step="0.01" min="0"
                            className={smallInputCls + ' w-full'}
                            value={opt.price_supplement || ''}
                            onChange={e => updateOption(group.id, opt.id, 'price_supplement', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        {/* Default */}
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={opt.default_selected}
                            onChange={e => updateOption(group.id, opt.id, 'default_selected', e.target.checked)}
                            className="accent-blue-600"
                          />
                        </div>
                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => removeOption(group.id, opt.id)} className="text-red-400 hover:text-red-600 p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addOption(group.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 px-1 py-1">
                      <Plus className="w-3 h-3" /> Ajouter une option
                    </button>
                  </div>

                  {/* Group preview badge */}
                  <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', group.display_type === 'select' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700')}>
                      {group.display_type === 'select' ? '▼ Menu déroulant' : '☑ Cases à cocher'}
                    </span>
                    {group.required && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Obligatoire</span>}
                    <span className="text-[10px] text-slate-400">{group.options.length} option{group.options.length > 1 ? 's' : ''}</span>
                    {group.options.filter(o => o.price_supplement > 0).length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        · prix: {group.options.filter(o => o.price_supplement > 0).map(o =>
                          `${o.label} +${o.price_supplement}${o.price_type === 'fixed' ? '€' : o.price_type === 'percent' ? '%' : '€/m²'}`
                        ).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* ─── Finitions par côté ─── */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Finitions par côté</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coupe franche, oeillet, renfort, couture… par côté du produit.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-600">Activer</span>
                    <div onClick={() => {
                      if (form.sides_finitions?.enabled) {
                        set('sides_finitions', null)
                      } else {
                        set('sides_finitions', {
                          enabled: true,
                          sides: [
                            { id: 'gauche', label: 'Côté gauche' },
                            { id: 'droit',  label: 'Côté droit' },
                            { id: 'haut',   label: 'Haut' },
                            { id: 'bas',    label: 'Bas' },
                          ],
                          options: [],
                          incompatibilities: [],
                        })
                      }
                    }}
                    className={cn('relative w-10 h-5 rounded-full cursor-pointer transition-colors', form.sides_finitions?.enabled ? 'bg-blue-500' : 'bg-slate-300')}>
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', form.sides_finitions?.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                    </div>
                  </label>
                </div>

                {form.sides_finitions?.enabled && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                      <strong>Info €/ml :</strong> le prix est calculé selon la longueur du côté (largeur pour haut/bas, hauteur pour gauche/droite).
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-600">Côtés</p>
                        <button onClick={() => set('sides_finitions', { ...form.sides_finitions!, sides: [...form.sides_finitions!.sides, { id: uid(), label: '' }] })}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          <Plus className="w-3 h-3" /> Ajouter un côté
                        </button>
                      </div>
                      {form.sides_finitions.sides.map((side, si) => (
                        <div key={side.id} className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button type="button" disabled={si === 0}
                              onClick={() => {
                                const arr = [...form.sides_finitions!.sides]
                                ;[arr[si - 1], arr[si]] = [arr[si], arr[si - 1]]
                                set('sides_finitions', { ...form.sides_finitions!, sides: arr })
                              }}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button type="button" disabled={si === form.sides_finitions!.sides.length - 1}
                              onClick={() => {
                                const arr = [...form.sides_finitions!.sides]
                                ;[arr[si], arr[si + 1]] = [arr[si + 1], arr[si]]
                                set('sides_finitions', { ...form.sides_finitions!, sides: arr })
                              }}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <input className={smallInputCls + ' flex-1'} value={side.label}
                            onChange={e => set('sides_finitions', { ...form.sides_finitions!, sides: form.sides_finitions!.sides.map(s => s.id === side.id ? { ...s, label: e.target.value } : s) })}
                            placeholder="Label du côté" />
                          <button onClick={() => set('sides_finitions', { ...form.sides_finitions!, sides: form.sides_finitions!.sides.filter(s => s.id !== side.id) })}
                            className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-600">Options <span className="font-normal text-slate-400">(partagées par tous les côtés)</span></p>
                        <button onClick={() => set('sides_finitions', { ...form.sides_finitions!, options: [...form.sides_finitions!.options, { id: uid(), label: '', price_type: 'fixed', price_supplement: 0 }] })}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          <Plus className="w-3 h-3" /> Ajouter
                        </button>
                      </div>
                      {form.sides_finitions.options.map((opt, oi) => (
                        <div key={opt.id} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                          {/* Reorder */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button type="button" disabled={oi === 0}
                              onClick={() => {
                                const arr = [...form.sides_finitions!.options]
                                ;[arr[oi - 1], arr[oi]] = [arr[oi], arr[oi - 1]]
                                set('sides_finitions', { ...form.sides_finitions!, options: arr })
                              }}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button type="button" disabled={oi === form.sides_finitions!.options.length - 1}
                              onClick={() => {
                                const arr = [...form.sides_finitions!.options]
                                ;[arr[oi], arr[oi + 1]] = [arr[oi + 1], arr[oi]]
                                set('sides_finitions', { ...form.sides_finitions!, options: arr })
                              }}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed p-0.5">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <input className={smallInputCls + ' flex-1 min-w-0'} value={opt.label}
                            onChange={e => set('sides_finitions', { ...form.sides_finitions!, options: form.sides_finitions!.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o) })}
                            placeholder="Coupe franche, Oeillet…" />
                          <select className={smallInputCls + ' w-36 flex-shrink-0'} value={opt.price_type}
                            onChange={e => set('sides_finitions', { ...form.sides_finitions!, options: form.sides_finitions!.options.map(o => o.id === opt.id ? { ...o, price_type: e.target.value as any } : o) })}>
                            <option value="fixed">€ fixe/côté</option>
                            <option value="per_ml">€/ml du côté</option>
                            <option value="percent">% du prix</option>
                          </select>
                          <input type="number" step="0.01" min="0" className={smallInputCls + ' w-16 flex-shrink-0'} value={opt.price_supplement || ''}
                            onChange={e => set('sides_finitions', { ...form.sides_finitions!, options: form.sides_finitions!.options.map(o => o.id === opt.id ? { ...o, price_supplement: parseFloat(e.target.value) || 0 } : o) })}
                            placeholder="0.00" />
                          <button onClick={() => set('sides_finitions', { ...form.sides_finitions!, options: form.sides_finitions!.options.filter(o => o.id !== opt.id) })}
                            className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>

                    {/* Incompatibilités */}
                    {form.sides_finitions.options.length >= 2 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-amber-700">Incompatibilités</p>
                            <p className="text-[11px] text-amber-600">Options qui ne peuvent pas être choisies ensemble sur le même côté.</p>
                          </div>
                          <button
                            onClick={() => set('sides_finitions', {
                              ...form.sides_finitions!,
                              incompatibilities: [...(form.sides_finitions!.incompatibilities ?? []), [form.sides_finitions!.options[0].id, form.sides_finitions!.options[1].id]],
                            })}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                            <Plus className="w-3 h-3" /> Ajouter
                          </button>
                        </div>
                        {(form.sides_finitions.incompatibilities ?? []).length === 0 && (
                          <p className="text-xs text-amber-600 italic">Aucune incompatibilité définie.</p>
                        )}
                        {(form.sides_finitions.incompatibilities ?? []).map(([a, b], idx) => (
                          <div key={idx} className="flex items-center gap-2 flex-wrap">
                            <select
                              className={smallInputCls}
                              value={a}
                              onChange={e => {
                                const newIncompat = [...(form.sides_finitions!.incompatibilities ?? [])]
                                newIncompat[idx] = [e.target.value, b]
                                set('sides_finitions', { ...form.sides_finitions!, incompatibilities: newIncompat })
                              }}>
                              {form.sides_finitions!.options.map(o => <option key={o.id} value={o.id}>{o.label || '(sans nom)'}</option>)}
                            </select>
                            <span className="text-[11px] font-bold text-amber-600">⚡ incompatible avec</span>
                            <select
                              className={smallInputCls}
                              value={b}
                              onChange={e => {
                                const newIncompat = [...(form.sides_finitions!.incompatibilities ?? [])]
                                newIncompat[idx] = [a, e.target.value]
                                set('sides_finitions', { ...form.sides_finitions!, incompatibilities: newIncompat })
                              }}>
                              {form.sides_finitions!.options.map(o => <option key={o.id} value={o.id}>{o.label || '(sans nom)'}</option>)}
                            </select>
                            <button
                              onClick={() => {
                                const newIncompat = (form.sides_finitions!.incompatibilities ?? []).filter((_, i) => i !== idx)
                                set('sides_finitions', { ...form.sides_finitions!, incompatibilities: newIncompat })
                              }}
                              className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── DÉLAIS ─── */}
          {section === 'delais' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Options de délai de production</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Un % de supplément est appliqué au prix de base selon le délai choisi.</p>
                </div>
                <button onClick={addDelai} className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
              {form.delai_options.map((d, i) => (
                <div key={d.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', d.surcharge_percent === 0 ? 'bg-green-100 text-green-700' : d.surcharge_percent <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                      {d.surcharge_percent === 0 ? 'Standard' : `+${d.surcharge_percent}%`}
                    </span>
                    {form.delai_options.length > 1 && (
                      <button onClick={() => removeDelai(d.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Libellé</label>
                      <input className={smallInputCls + ' w-full'} value={d.label} onChange={e => updateDelai(d.id, 'label', e.target.value)} placeholder="Standard (5-7 jours)..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Délai (jours)</label>
                      <input type="number" min="1" max="30" className={smallInputCls + ' w-full'} value={d.days} onChange={e => updateDelai(d.id, 'days', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Supplément (%)</label>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="200" className={smallInputCls + ' flex-1'} value={d.surcharge_percent} onChange={e => updateDelai(d.id, 'surcharge_percent', parseInt(e.target.value) || 0)} />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ Le supplément est calculé sur le prix de base, avant finitions.
              </div>
            </div>
          )}

          {/* ─── IMAGES ─── */}
          {section === 'images' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-600">Image principale</p>
                <div className="flex items-start gap-4">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-24 h-24 object-cover rounded-xl border border-slate-200 flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0"><ImageIcon className="w-8 h-8 text-slate-400" /></div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input className={inputCls} value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://... (coller une URL)" />
                    <div>
                      <input ref={mainImageRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                      <button onClick={() => mainImageRef.current?.click()} disabled={uploadingMain}
                        className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <Upload className="w-3.5 h-3.5" />{uploadingMain ? 'Upload en cours…' : 'Uploader une image'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">Images supplémentaires</p>
                  <div>
                    <input ref={extraImageRef} type="file" accept="image/*" className="hidden" onChange={handleExtraImageUpload} />
                    <button onClick={() => extraImageRef.current?.click()} disabled={uploadingExtra}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" />{uploadingExtra ? 'Upload…' : 'Ajouter'}
                    </button>
                  </div>
                </div>
                {form.images.filter(Boolean).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">Aucune image supplémentaire.</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {form.images.filter(Boolean).map((url: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt="" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                        <button onClick={() => removeExtraImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── CERTIFICATS ─── */}
          {section === 'certificats' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Certificats et fiches techniques</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Certificats feu, fiches techniques, certifications IT…</p>
                </div>
                {!showCertForm && (
                  <button onClick={() => setShowCertForm(true)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                )}
              </div>

              {form.certificates.length === 0 && !showCertForm && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">Aucun certificat.</div>
              )}

              {form.certificates.map((cert: Certificate, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-red-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 text-sm">{cert.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', CERT_TYPE_COLORS[cert.type])}>{CERT_TYPE_LABELS[cert.type]}</span>
                      <a href={cert.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline truncate">Télécharger</a>
                    </div>
                  </div>
                  <button onClick={() => removeCert(idx)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}

              {showCertForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700">Nouveau certificat</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                    <input className={inputCls} value={newCertName} onChange={e => setNewCertName(e.target.value)} placeholder="Certificat feu classe B1…" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                    <select className={inputCls} value={newCertType} onChange={e => setNewCertType(e.target.value as any)}>
                      <option value="fire">Certificat feu</option>
                      <option value="tech">Fiche technique</option>
                      <option value="it">Fiche informative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Fichier PDF *</label>
                    <input ref={certFileRef} type="file" accept=".pdf" className="hidden" onChange={handleCertUpload} />
                    <button onClick={() => { if (!newCertName.trim()) { setError('Saisissez le nom du certificat'); return }; setError(''); certFileRef.current?.click() }}
                      disabled={uploadingCert}
                      className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-white border border-blue-200 px-3 py-2 rounded-lg disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" />{uploadingCert ? 'Upload en cours…' : 'Sélectionner et uploader'}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => { setShowCertForm(false); setNewCertName(''); setNewCertType('fire') }} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Annuler</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── SEO ── */}
          {section === 'seo' && (() => {
            const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
            const preTitle  = form.seo_title  || form.name  || 'Titre de la page'
            const preDesc   = form.seo_description || 'Description de la page pour les moteurs de recherche…'
            const preUrl    = `${siteUrl}/produit/${(form.name || 'produit').toLowerCase().replace(/\s+/g, '-')}`
            const titleLen  = form.seo_title.length
            const descLen   = form.seo_description.length
            return (
              <div className="space-y-5">
                {/* Aperçu Google */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Aperçu dans Google</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 truncate">{preUrl}</p>
                    <p className="text-blue-700 text-base font-medium leading-snug line-clamp-1 hover:underline cursor-pointer">{preTitle}</p>
                    <p className="text-slate-600 text-sm leading-snug line-clamp-2">{preDesc}</p>
                  </div>
                </div>

                {/* Titre SEO */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Titre SEO <span className="font-normal normal-case">(balise &lt;title&gt;)</span>
                    </label>
                    <span className={`text-[11px] font-semibold ${titleLen > 60 ? 'text-red-500' : titleLen > 50 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {titleLen}/60
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-1.5">Si vide, le nom du produit est utilisé. Idéalement 50-60 caractères.</p>
                  <input
                    type="text"
                    value={form.seo_title}
                    onChange={e => set('seo_title', e.target.value)}
                    placeholder={form.name || 'Ex: Bâche grand format personnalisée — Comink Liège'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Meta description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Meta description
                    </label>
                    <span className={`text-[11px] font-semibold ${descLen > 160 ? 'text-red-500' : descLen > 140 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {descLen}/160
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-1.5">Texte affiché sous le titre dans les résultats Google. 140-160 caractères idéalement.</p>
                  <textarea
                    rows={3}
                    value={form.seo_description}
                    onChange={e => set('seo_description', e.target.value)}
                    placeholder="Ex: Imprimez vos bâches grand format sur mesure avec Comink à Liège. Qualité professionnelle, délai express, devis gratuit en ligne."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Mots-clés */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mots-clés <span className="font-normal normal-case">(séparés par des virgules)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Impact SEO limité sur Google, utile pour la recherche interne et Bing.</p>
                  <input
                    type="text"
                    value={form.seo_keywords}
                    onChange={e => set('seo_keywords', e.target.value)}
                    placeholder="bâche, impression grand format, Liège, personnalisé"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Info JSON-LD */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                  <p className="font-bold">✓ Données structurées (JSON-LD) générées automatiquement</p>
                  <p className="text-blue-600">Chaque page produit inclut un balisage Schema.org de type <code className="bg-blue-100 px-1 rounded">Product</code> avec le nom, la description, la disponibilité et la marque — aucune configuration requise.</p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Enregistrement…' : product ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
