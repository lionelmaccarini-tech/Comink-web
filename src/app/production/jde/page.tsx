'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Coins, Pencil, Trash2, X, Check } from 'lucide-react'

interface JDEClient {
  id: string
  full_name: string
  company: string | null
  email: string
  points_balance: number
  logo_url: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

interface JDEProduct {
  id: string
  name: string
  category: string | null
  point_cost: number
  active: boolean
  sort_order: number
  template_url: string | null
}

type Tab = 'clients' | 'products'

export default function JDEAdminPage() {
  const [tab, setTab] = useState<Tab>('clients')
  const [clients, setClients] = useState<JDEClient[]>([])
  const [products, setProducts] = useState<JDEProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState<JDEClient | null>(null)
  const [editingProduct, setEditingProduct] = useState<JDEProduct | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Client form
  const [clientForm, setClientForm] = useState({ full_name: '', company: '', email: '', points_balance: '0', notes: '' })
  // Product form
  const [productForm, setProductForm] = useState({ name: '', description: '', category: '', point_cost: '0', template_url: '', sort_order: '0' })
  // Points form
  const [pointsForm, setPointsForm] = useState({ amount: '', type: 'credit' as 'credit' | 'debit', description: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [clientsRes, productsRes] = await Promise.all([
      fetch('/api/jde/admin/clients'),
      fetch('/api/jde/admin/products'),
    ])
    if (clientsRes.ok) {
      const d = await clientsRes.json()
      setClients(d.clients ?? [])
    }
    if (productsRes.ok) {
      const d = await productsRes.json()
      setProducts(d.products ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/jde/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: clientForm.full_name,
        company: clientForm.company || null,
        email: clientForm.email,
        points_balance: parseInt(clientForm.points_balance) || 0,
        notes: clientForm.notes || null,
      }),
    })
    if (res.ok) {
      setShowClientModal(false)
      setClientForm({ full_name: '', company: '', email: '', points_balance: '0', notes: '' })
      fetchData()
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur création client')
    }
    setSaving(false)
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const method = editingProduct ? 'PATCH' : 'POST'
    const url = editingProduct ? `/api/jde/admin/products/${editingProduct.id}` : '/api/jde/admin/products'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: productForm.name,
        category: productForm.category || null,
        point_cost: parseInt(productForm.point_cost) || 0,
        template_url: productForm.template_url || null,
        sort_order: parseInt(productForm.sort_order) || 0,
      }),
    })
    if (res.ok) {
      setShowProductModal(false)
      setEditingProduct(null)
      setProductForm({ name: '', description: '', category: '', point_cost: '0', template_url: '', sort_order: '0' })
      fetchData()
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur produit')
    }
    setSaving(false)
  }

  const handleDeleteProduct = async (product: JDEProduct) => {
    if (!confirm(`Désactiver "${product.name}" ?`)) return
    await fetch(`/api/jde/admin/products/${product.id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showPointsModal) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/jde/admin/clients/${showPointsModal.id}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseInt(pointsForm.amount),
        type: pointsForm.type,
        description: pointsForm.description || null,
      }),
    })
    if (res.ok) {
      setShowPointsModal(null)
      setPointsForm({ amount: '', type: 'credit', description: '' })
      fetchData()
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur points')
    }
    setSaving(false)
  }

  const openEditProduct = (product: JDEProduct) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: '',
      category: product.category ?? '',
      point_cost: String(product.point_cost),
      template_url: product.template_url ?? '',
      sort_order: String(product.sort_order),
    })
    setShowProductModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8271A]" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center bg-[#F5C200] text-slate-900 font-extrabold px-4 py-1.5 rounded-xl text-lg tracking-tight mb-2">
            PRINT MY JDE
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Administration JDE</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {(['clients', 'products'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'clients' ? `Clients (${clients.length})` : `Produits (${products.length})`}
          </button>
        ))}
      </div>

      {/* Clients tab */}
      {tab === 'clients' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center gap-2 bg-[#E8271A] hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un client
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Email</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Points</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">Logo</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Aucun client JDE</td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{client.full_name}</p>
                        {client.company && <p className="text-xs text-slate-400">{client.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{client.email}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-extrabold text-[#F5C200] text-base">{client.points_balance}</span>
                        <span className="text-xs text-slate-400 ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.logo_url ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                            <Check className="w-3 h-3 text-green-600" />
                          </span>
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-200" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          client.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {client.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setShowPointsModal(client); setError('') }}
                          className="p-1.5 text-slate-400 hover:text-[#F5C200] transition-colors"
                          title="Gérer les points"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setShowProductModal(true); setEditingProduct(null); setProductForm({ name: '', description: '', category: '', point_cost: '0', template_url: '', sort_order: '0' }) }}
              className="flex items-center gap-2 bg-[#E8271A] hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un produit
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Produit</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Catégorie</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Points</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">Template</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Aucun produit JDE</td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{product.name}</td>
                      <td className="px-4 py-3 text-slate-500">{product.category ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-extrabold text-[#E8271A]">{product.point_cost}</span>
                        <span className="text-xs text-slate-400 ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.template_url ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                            <Check className="w-3 h-3 text-green-600" />
                          </span>
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-200" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          product.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {product.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditProduct(product)}
                            className="p-1.5 text-slate-400 hover:text-[#F5C200] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 text-slate-400 hover:text-[#E8271A] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client modal */}
      {showClientModal && (
        <Modal title="Ajouter un client JDE" onClose={() => setShowClientModal(false)}>
          <form onSubmit={handleCreateClient} className="space-y-4">
            {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <Field label="Nom complet *">
              <input required value={clientForm.full_name} onChange={e => setClientForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="Jean Dupont" />
            </Field>
            <Field label="Entreprise">
              <input value={clientForm.company} onChange={e => setClientForm(f => ({ ...f, company: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="Nom de l'entreprise" />
            </Field>
            <Field label="Email *">
              <input required type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="jean@entreprise.be" />
            </Field>
            <Field label="Points de départ">
              <input type="number" min="0" value={clientForm.points_balance} onChange={e => setClientForm(f => ({ ...f, points_balance: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" />
            </Field>
            <Field label="Notes">
              <textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F5C200] resize-none" rows={2} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowClientModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-[#E8271A] hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Product modal */}
      {showProductModal && (
        <Modal title={editingProduct ? 'Modifier le produit' : 'Ajouter un produit'} onClose={() => { setShowProductModal(false); setEditingProduct(null) }}>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <Field label="Nom *">
              <input required value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="Nom du produit" />
            </Field>
            <Field label="Catégorie">
              <input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="Goodies, Textile, ..." />
            </Field>
            <Field label="Coût en points *">
              <input required type="number" min="0" value={productForm.point_cost} onChange={e => setProductForm(f => ({ ...f, point_cost: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" />
            </Field>
            <Field label="URL du template">
              <input value={productForm.template_url} onChange={e => setProductForm(f => ({ ...f, template_url: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="https://..." />
            </Field>
            <Field label="Ordre d'affichage">
              <input type="number" min="0" value={productForm.sort_order} onChange={e => setProductForm(f => ({ ...f, sort_order: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null) }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-[#E8271A] hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Points modal */}
      {showPointsModal && (
        <Modal title={`Points — ${showPointsModal.full_name}`} onClose={() => setShowPointsModal(null)}>
          <div className="mb-4 bg-[#F5C200]/20 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Solde actuel</p>
            <p className="text-4xl font-extrabold text-[#F5C200]">{showPointsModal.points_balance}</p>
            <p className="text-xs text-slate-400">points</p>
          </div>
          <form onSubmit={handleAddPoints} className="space-y-4">
            {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <Field label="Type d'opération">
              <select value={pointsForm.type} onChange={e => setPointsForm(f => ({ ...f, type: e.target.value as 'credit' | 'debit' }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]">
                <option value="credit">Crédit (ajout)</option>
                <option value="debit">Débit (retrait)</option>
                <option value="purchase">Achat</option>
              </select>
            </Field>
            <Field label="Montant *">
              <input required type="number" min="1" value={pointsForm.amount} onChange={e => setPointsForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="100" />
            </Field>
            <Field label="Description">
              <input value={pointsForm.description} onChange={e => setPointsForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" placeholder="Journée découverte 2025" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowPointsModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-[#F5C200] hover:bg-yellow-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

