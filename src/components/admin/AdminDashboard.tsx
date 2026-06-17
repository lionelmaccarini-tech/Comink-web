'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, Users, Search, Plus, Edit2, Trash2, Eye, RefreshCw, Settings, Tag, FolderOpen, Save, Loader2, Settings2, CreditCard, Copy, BookOpen, FileText, Brain, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProductModal from './ProductModal'
import CollaborateursTab from './CollaborateursTab'
import PriceListsTab from './PriceListsTab'
import CategoriesTab, { type Category } from './CategoriesTab'
import ProductionTab from './ProductionTab'
import PaymentDeliveryTab from './PaymentDeliveryTab'
import BlogTab from './BlogTab'
import LegalPagesTab from './LegalPagesTab'
import AngeloKnowledgeTab from './AngeloKnowledgeTab'
import AnalyticsTab from './AnalyticsTab'

type TabId = 'produits' | 'clients' | 'listes-prix' | 'collaborateurs' | 'categories' | 'production' | 'payment' | 'blog' | 'legal' | 'angelo' | 'analytics' | 'parametres'

export default function AdminDashboard({ userEmail }: { userEmail: string }) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabId>((searchParams.get('tab') as TabId) || 'produits')

  // App settings state
  const [quoteValidityDays, setQuoteValidityDays] = useState('30')
  // SEO global
  const [seoSiteName,     setSeoSiteName]     = useState('Comink')
  const [seoDefaultDesc,  setSeoDefaultDesc]  = useState('')
  const [seoOgImage,      setSeoOgImage]      = useState('')
  const [seoGaId,         setSeoGaId]         = useState('')
  const [seoGscCode,      setSeoGscCode]      = useState('')

  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d?.quote_validity_days) setQuoteValidityDays(d.quote_validity_days)
      if (d?.seo_site_name)    setSeoSiteName(d.seo_site_name)
      if (d?.seo_default_desc) setSeoDefaultDesc(d.seo_default_desc)
      if (d?.seo_og_image)     setSeoOgImage(d.seo_og_image)
      if (d?.seo_ga_id)        setSeoGaId(d.seo_ga_id)
      if (d?.seo_gsc_code)     setSeoGscCode(d.seo_gsc_code)
    }).catch(() => {})
  }, [])

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_validity_days: quoteValidityDays,
          seo_site_name:    seoSiteName,
          seo_default_desc: seoDefaultDesc,
          seo_og_image:     seoOgImage,
          seo_ga_id:        seoGaId,
          seo_gsc_code:     seoGscCode,
        }),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2500)
    } finally {
      setSavingSettings(false)
    }
  }

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCategories(d)
    })
  }, [])

  const categoryLabel = (id: string) => categories.find(c => c.id === id)?.label ?? id

  // Products state
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'sur_mesure' | 'taille_standard'>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showUnavailable, setShowUnavailable] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  function openCreate() { setEditingProduct(null); setModalOpen(true) }
  function openEdit(p: any) { setEditingProduct(p); setModalOpen(true) }

  function handleSaved(p: any) {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]
    })
    setModalOpen(false)
  }

  async function toggleAvailable(p: any) {
    const res = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, available: !p.available }),
    })
    const updated = await res.json()
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, available: updated.available } : x))
  }

  async function duplicateProduct(p: any) {
    setDuplicatingId(p.id)
    const copy = {
      name:                      `${p.name} (copie)`,
      description:               p.description ?? null,
      category:                  p.category,
      product_type:              p.product_type,
      image_url:                 p.image_url ?? null,
      images:                    p.images ?? [],
      price_per_m2:              p.price_per_m2 ?? null,
      standard_sizes:            p.standard_sizes ?? [],
      min_width_cm:              p.min_width_cm ?? null,
      max_width_cm:              p.max_width_cm ?? null,
      min_height_cm:             p.min_height_cm ?? null,
      max_height_cm:             p.max_height_cm ?? null,
      available:                 false,
      finitions:                 p.finitions ?? [],
      delai_options:             p.delai_options ?? [],
      sides_finitions:           p.sides_finitions ?? null,
      certificates:              p.certificates ?? [],
      restricted_to_price_lists: p.restricted_to_price_lists ?? [],
      vat_rate:                  p.vat_rate ?? 21,
      production_code:           null,   // doit être unique — à renseigner manuellement après copie
      free_shipping:             p.free_shipping ?? false,
      free_shipping_threshold:   p.free_shipping_threshold ?? null,
      seo_title:                 p.seo_title ?? null,
      seo_description:           p.seo_description ?? null,
      jde_enabled:               p.jde_enabled ?? false,
      visibility_group:          p.visibility_group ?? null,
      bleed_mm:                  p.bleed_mm ?? 3,
    }
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`)
      setProducts(prev => [json, ...prev])
      openEdit(json)
    } catch (e: any) {
      alert(`Erreur duplication : ${e.message}`)
    } finally {
      setDuplicatingId(null)
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return
    setDeletingId(id)
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  const productCategories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    if (!showUnavailable && !p.available) return false
    if (filterType !== 'all' && p.product_type !== filterType) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.category?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: products.length,
    available: products.filter(p => p.available).length,
    surMesure: products.filter(p => p.product_type === 'sur_mesure').length,
    standard: products.filter(p => p.product_type === 'taille_standard').length,
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {([
            { id: 'produits' as const, icon: Package, label: 'Produits', badge: stats.total as number | undefined },
            { id: 'listes-prix' as const, icon: Tag, label: 'Listes de prix', badge: undefined },
            { id: 'collaborateurs' as const, icon: Users, label: 'Collaborateurs', badge: undefined },
            { id: 'categories' as const, icon: FolderOpen, label: 'Catégories', badge: categories.length > 0 ? categories.length : undefined },
            { id: 'production' as const, icon: Settings2, label: 'Production', badge: undefined },
            { id: 'payment' as const, icon: CreditCard, label: 'Paiement & Livraison', badge: undefined },
            { id: 'blog' as const, icon: BookOpen, label: 'Blog', badge: undefined },
            { id: 'legal' as const, icon: FileText, label: 'Pages légales', badge: undefined },
            { id: 'analytics' as const, icon: BarChart2, label: 'Analytics', badge: undefined },
            { id: 'angelo' as const, icon: Brain, label: 'Angelo IA', badge: undefined },
            { id: 'parametres' as const, icon: Settings, label: 'Paramètres', badge: undefined },
          ]).map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all', tab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')}>
              <Icon className="w-4 h-4" /> {label}
              {badge !== undefined && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── PRODUITS ── */}
        {tab === 'produits' && (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Produits total', value: stats.total, color: 'text-slate-900' },
                { label: 'En ligne', value: stats.available, color: 'text-green-600' },
                { label: 'Sur mesure', value: stats.surMesure, color: 'text-blue-600' },
                { label: 'Taille standard', value: stats.standard, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rechercher un produit…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="sur_mesure">Sur mesure</option>
                <option value="taille_standard">Taille standard</option>
              </select>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toutes catégories</option>
                {productCategories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{categoryLabel(c)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input type="checkbox" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} className="accent-blue-600" />
                Masqués
              </label>
              <button onClick={loadProducts} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Rafraîchir">
                <RefreshCw className={cn('w-4 h-4 text-slate-400', loadingProducts && 'animate-spin')} />
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nouveau produit
              </button>
            </div>

            {/* Products table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {loadingProducts ? (
                <div className="p-12 text-center text-slate-400">Chargement des produits…</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Aucun produit</p>
                  <p className="text-xs text-slate-400 mt-1">Créez votre premier produit en cliquant sur "Nouveau produit".</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left">Produit</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Tarif</th>
                      <th className="px-5 py-3 text-left">Finitions</th>
                      <th className="px-5 py-3 text-left">Délais</th>
                      <th className="px-5 py-3 text-center">Statut</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => (
                      <tr key={p.id} className={cn('hover:bg-slate-50 transition-colors', !p.available && 'opacity-60')}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {(p.image_url || p.images?.[0]) ? (
                              <img src={p.image_url || p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-slate-300" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                              <p className="text-xs text-slate-400">{categoryLabel(p.category)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', p.product_type === 'sur_mesure' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                            {p.product_type === 'sur_mesure' ? 'Sur mesure' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {p.product_type === 'sur_mesure' && p.price_per_m2
                            ? <><strong className="text-slate-800">{Number(p.price_per_m2).toFixed(2)} €</strong>/m²</>
                            : p.standard_sizes?.length > 0
                            ? <>{p.standard_sizes.length} taille{p.standard_sizes.length > 1 ? 's' : ''}</>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {p.finitions?.length > 0 ? `${p.finitions.length} option${p.finitions.length > 1 ? 's' : ''}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {p.delai_options?.length > 0 ? `${p.delai_options.length} délai${p.delai_options.length > 1 ? 's' : ''}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button onClick={() => toggleAvailable(p)} title={p.available ? 'Masquer' : 'Mettre en ligne'}>
                            {p.available
                              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">● En ligne</span>
                              : <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">● Masqué</span>}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <a href={`/produit/${p.id}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Voir sur le site">
                              <Eye className="w-4 h-4" />
                            </a>
                            <button onClick={() => duplicateProduct(p)} disabled={duplicatingId === p.id} className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50" title="Dupliquer ce produit">
                              {duplicatingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Modifier">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              disabled={deletingId === p.id}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-slate-400 text-right">{filtered.length} produit{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</p>
          </div>
        )}

        {/* ── CLIENTS ── */}

        {/* ── LISTES DE PRIX ── */}
        {tab === 'listes-prix' && <PriceListsTab />}

        {/* ── COLLABORATEURS ── */}
        {tab === 'collaborateurs' && <CollaborateursTab />}

        {/* ── CATÉGORIES ── */}
        {tab === 'categories' && (
          <CategoriesTab categories={categories} onChange={setCategories} />
        )}

        {/* ── PRODUCTION ── */}
        {tab === 'production' && <ProductionTab />}

        {/* ── PAIEMENT & LIVRAISON ── */}
        {tab === 'payment' && <PaymentDeliveryTab />}

        {/* ── BLOG ── */}
        {tab === 'blog' && <BlogTab />}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && <AnalyticsTab />}

        {/* ── ANGELO IA ── */}
        {tab === 'angelo' && <AngeloKnowledgeTab />}


        {/* ── PAGES LÉGALES ── */}
        {tab === 'legal' && <LegalPagesTab />}

        {/* ── PARAMÈTRES ── */}
        {tab === 'parametres' && (
          <div className="space-y-5 max-w-2xl">
            {/* Quote validity setting */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Réglages devis</h3>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Validité des devis (jours)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Durée de validité par défaut appliquée aux devis générés depuis le panier.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={quoteValidityDays}
                    onChange={e => setQuoteValidityDays(e.target.value)}
                    className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500 ml-2">jours</span>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  {savingSettings
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : settingsSaved
                    ? '✓ Enregistré'
                    : <><Save className="w-4 h-4" /> Enregistrer</>
                  }
                </button>
              </div>
            </div>

            {/* ── SEO Global ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1">SEO &amp; Référencement du site</h3>
              <p className="text-xs text-slate-400 mb-5">Ces réglages s'appliquent à l'ensemble du site. Les champs SEO de chaque produit sont prioritaires.</p>
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom du site</label>
                    <input type="text" value={seoSiteName} onChange={e => setSeoSiteName(e.target.value)}
                      placeholder="Comink" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Google Analytics 4 ID</label>
                    <input type="text" value={seoGaId} onChange={e => setSeoGaId(e.target.value)}
                      placeholder="G-XXXXXXXXXX" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meta description par défaut</label>
                    <span className={`text-[11px] font-semibold ${seoDefaultDesc.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>{seoDefaultDesc.length}/160</span>
                  </div>
                  <textarea rows={2} value={seoDefaultDesc} onChange={e => setSeoDefaultDesc(e.target.value)}
                    placeholder="Impression grand format professionnelle à Liège. Banderoles, bâches, roll-up, adhésifs et plus."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Image Open Graph par défaut <span className="font-normal normal-case">(URL, 1200×630px recommandé)</span></label>
                  <input type="url" value={seoOgImage} onChange={e => setSeoOgImage(e.target.value)}
                    placeholder="https://comink.be/og-image.jpg" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {seoOgImage && <img src={seoOgImage} alt="OG preview" className="mt-2 h-20 object-cover rounded border border-slate-200" onError={e => (e.currentTarget.style.display='none')} />}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Google Search Console — code de vérification</label>
                  <input type="text" value={seoGscCode} onChange={e => setSeoGscCode(e.target.value)}
                    placeholder="Contenu de la balise meta google-site-verification" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-[11px] text-slate-400 mt-1">Dans Google Search Console → Vérifier → Balise HTML → copiez uniquement le contenu de l'attribut <code className="bg-slate-100 px-1 rounded">content</code>.</p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <a href="/sitemap.xml" target="_blank" className="text-xs text-blue-600 hover:underline font-medium">↗ Voir sitemap.xml</a>
                  <a href="/robots.txt" target="_blank" className="text-xs text-blue-600 hover:underline font-medium">↗ Voir robots.txt</a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Informations de l'entreprise</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Entreprise', value: 'Comink' },
                  { label: 'Email', value: 'info@comink.be' },
                  { label: 'Téléphone', value: '+32 4 233 01 38' },
                  { label: 'Adresse', value: 'Rue de Bruxelles 174h, 4340 Awans' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-slate-700 font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-2">Compte admin</h3>
              <p className="text-sm text-slate-500">Connecté en tant que <strong className="text-slate-700">{userEmail}</strong></p>
              <p className="text-xs text-slate-400 mt-2">Pour ajouter d'autres admins, utilisez l'onglet Collaborateurs et attribuez le rôle "Admin".</p>
            </div>
          </div>
        )}
      </div>

      {/* Product modal */}
      {modalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          categories={categories}
        />
      )}

    </div>
  )
}
