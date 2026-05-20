'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'banderoles', label: 'Banderoles' },
  { value: 'roll_up', label: 'Roll-up' },
  { value: 'drapeaux', label: 'Drapeaux' },
  { value: 'adhesifs', label: 'Adhésifs' },
  { value: 'toiles', label: 'Toiles' },
  { value: 'baches', label: 'Bâches' },
  { value: 'panneaux', label: 'Panneaux' },
  { value: 'textile', label: 'Textile' },
  { value: 'papier', label: 'Papier' },
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'supports_evenementiels', label: 'Supports évènementiels' },
  { value: 'vinyle_autocollant', label: 'Vinyle autocollant' },
]

interface Rule {
  id?: string
  rule_type: 'product' | 'category'
  product_id?: string | null
  category?: string | null
  custom_price_per_m2?: number | null
  discount_percent?: number | null
}

interface PriceListForm {
  name: string
  description: string
  discount_percent: number | ''
  free_shipping: boolean
  free_shipping_threshold: number | ''
  is_default: boolean
}

interface Props {
  priceList: any | null
  onClose: () => void
  onSaved: (pl: any) => void
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const smallInputCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={cn('relative w-10 h-5 rounded-full cursor-pointer transition-colors', checked ? 'bg-blue-600' : 'bg-slate-300')}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </div>
  )
}

export default function PriceListModal({ priceList, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'general' | 'rules'>('general')
  const [form, setForm] = useState<PriceListForm>({
    name: '',
    description: '',
    discount_percent: '',
    free_shipping: false,
    free_shipping_threshold: '',
    is_default: false,
  })
  const [rules, setRules] = useState<Rule[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // New rule form state
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [newRule, setNewRule] = useState<Rule>({ rule_type: 'product', product_id: null, category: null, custom_price_per_m2: null, discount_percent: null })
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (priceList) {
      setForm({
        name: priceList.name ?? '',
        description: priceList.description ?? '',
        discount_percent: priceList.discount_percent ?? '',
        free_shipping: priceList.free_shipping ?? false,
        free_shipping_threshold: priceList.free_shipping_threshold ?? '',
        is_default: priceList.is_default ?? false,
      })
      setRules(priceList.rules ?? [])
    }
  }, [priceList])

  useEffect(() => {
    if (showRuleForm && newRule.rule_type === 'product' && products.length === 0) {
      setLoadingProducts(true)
      fetch('/api/admin/products')
        .then(r => r.json())
        .then(d => setProducts(Array.isArray(d) ? d : []))
        .finally(() => setLoadingProducts(false))
    }
  }, [showRuleForm, newRule.rule_type])

  const set = (key: keyof PriceListForm, value: any) => setForm(f => ({ ...f, [key]: value }))

  function addRule() {
    if (newRule.rule_type === 'product' && !newRule.product_id) return
    if (newRule.rule_type === 'category' && !newRule.category) return
    setRules(prev => [...prev, { ...newRule }])
    setNewRule({ rule_type: 'product', product_id: null, category: null, custom_price_per_m2: null, discount_percent: null })
    setShowRuleForm(false)
  }

  function removeRule(idx: number) {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...(priceList?.id ? { id: priceList.id } : {}),
        name: form.name.trim(),
        description: form.description || null,
        discount_percent: form.discount_percent !== '' ? Number(form.discount_percent) : null,
        free_shipping: form.free_shipping,
        free_shipping_threshold: form.free_shipping && form.free_shipping_threshold !== '' ? Number(form.free_shipping_threshold) : null,
        is_default: form.is_default,
        rules: rules.map(r => ({
          rule_type: r.rule_type,
          product_id: r.product_id || null,
          category: r.category || null,
          custom_price_per_m2: r.custom_price_per_m2 ?? null,
          discount_percent: r.discount_percent ?? null,
        })),
      }
      const method = priceList?.id ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/price-lists', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur serveur')
      onSaved(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">{priceList ? 'Modifier la liste de prix' : 'Nouvelle liste de prix'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-blue-700 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {[
            { id: 'general', label: 'Général' },
            { id: 'rules', label: `Règles tarifaires${rules.length ? ` (${rules.length})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={cn('px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px', tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* ─── GÉNÉRAL ─── */}
          {tab === 'general' && (
            <>
              <Field label="Nom *">
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Tarif revendeur, Grands comptes…" />
              </Field>

              <Field label="Description">
                <textarea className={cn(inputCls, 'resize-none')} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description interne de cette liste de prix…" />
              </Field>

              <Field label="Remise globale (%)" hint="Appliquée à tous les produits non couverts par une règle spécifique">
                <div className="flex items-center gap-2 max-w-[180px]">
                  <input type="number" min="0" max="100" step="0.5" className={inputCls} value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="0" />
                  <span className="text-sm text-slate-500 font-semibold">%</span>
                </div>
              </Field>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Port gratuit</p>
                    <p className="text-xs text-slate-400">Activer la livraison gratuite pour les clients avec cette liste</p>
                  </div>
                  <Toggle checked={form.free_shipping} onChange={v => set('free_shipping', v)} />
                </div>
                {form.free_shipping && (
                  <Field label="Seuil minimum de commande (€)" hint="Laisser vide ou mettre 0 pour toujours gratuit">
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <input type="number" min="0" step="0.01" className={inputCls} value={form.free_shipping_threshold} onChange={e => set('free_shipping_threshold', e.target.value)} placeholder="0.00" />
                      <span className="text-sm text-slate-500 font-semibold">€</span>
                    </div>
                  </Field>
                )}
              </div>

              <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Liste de prix par défaut</p>
                  <p className="text-xs text-amber-600">Appliquée aux nouveaux clients sans liste assignée</p>
                </div>
                <Toggle checked={form.is_default} onChange={v => set('is_default', v)} />
              </div>
            </>
          )}

          {/* ─── RÈGLES TARIFAIRES ─── */}
          {tab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Règles spécifiques par produit ou catégorie</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ces règles priment sur la remise globale.</p>
                </div>
                {!showRuleForm && (
                  <button onClick={() => setShowRuleForm(true)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> Ajouter une règle
                  </button>
                )}
              </div>

              {/* Existing rules */}
              {rules.length === 0 && !showRuleForm && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Aucune règle. Cliquez sur "Ajouter une règle".
                </div>
              )}

              {rules.map((r, idx) => {
                const productName = r.rule_type === 'product'
                  ? (products.find(p => p.id === r.product_id)?.name ?? r.product_id ?? '—')
                  : null
                const catLabel = r.rule_type === 'category'
                  ? (CATEGORIES.find(c => c.value === r.category)?.label ?? r.category ?? '—')
                  : null
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-start justify-between gap-3">
                    <div className="flex-1 text-sm">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full mr-2', r.rule_type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                        {r.rule_type === 'product' ? 'Produit' : 'Catégorie'}
                      </span>
                      <span className="font-semibold text-slate-700">{r.rule_type === 'product' ? productName : catLabel}</span>
                      <div className="text-xs text-slate-500 mt-1 flex gap-3">
                        {r.custom_price_per_m2 != null && <span>{r.custom_price_per_m2} €/m²</span>}
                        {r.discount_percent != null && <span>−{r.discount_percent}%</span>}
                      </div>
                    </div>
                    <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}

              {/* New rule form */}
              {showRuleForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700">Nouvelle règle</p>

                  <Field label="Type de règle">
                    <select className={inputCls} value={newRule.rule_type} onChange={e => setNewRule(r => ({ ...r, rule_type: e.target.value as any, product_id: null, category: null }))}>
                      <option value="product">Par produit</option>
                      <option value="category">Par catégorie</option>
                    </select>
                  </Field>

                  {newRule.rule_type === 'product' && (
                    <Field label="Produit">
                      {loadingProducts ? (
                        <p className="text-xs text-slate-400">Chargement des produits…</p>
                      ) : (
                        <select className={inputCls} value={newRule.product_id ?? ''} onChange={e => setNewRule(r => ({ ...r, product_id: e.target.value || null }))}>
                          <option value="">-- Sélectionner un produit --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </Field>
                  )}

                  {newRule.rule_type === 'category' && (
                    <Field label="Catégorie">
                      <select className={inputCls} value={newRule.category ?? ''} onChange={e => setNewRule(r => ({ ...r, category: e.target.value || null }))}>
                        <option value="">-- Sélectionner une catégorie --</option>
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prix/m² spécifique (€)" hint="Optionnel">
                      <input type="number" min="0" step="0.01" className={inputCls} value={newRule.custom_price_per_m2 ?? ''} onChange={e => setNewRule(r => ({ ...r, custom_price_per_m2: e.target.value ? Number(e.target.value) : null }))} placeholder="ex: 7.50" />
                    </Field>
                    <Field label="Remise % spécifique" hint="Optionnel (0–100)">
                      <input type="number" min="0" max="100" step="0.5" className={inputCls} value={newRule.discount_percent ?? ''} onChange={e => setNewRule(r => ({ ...r, discount_percent: e.target.value ? Number(e.target.value) : null }))} placeholder="ex: 15" />
                    </Field>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowRuleForm(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors">Annuler</button>
                    <button onClick={addRule} className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Ajouter la règle
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement…' : priceList ? 'Mettre à jour' : 'Créer la liste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
