'use client'

import React, { useState, useEffect } from 'react'
import { Plus, RefreshCw, Edit2, Trash2, Tag, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import PriceListModal from './PriceListModal'
import PriceExportModal from './PriceExportModal'

export default function PriceListsTab() {
  const [priceLists, setPriceLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [exportPriceListId, setExportPriceListId] = useState<string | null>(null)
  const [exportTitle, setExportTitle] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/price-lists')
      const data = await res.json()
      setPriceLists(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(pl: any) { setEditing(pl); setModalOpen(true) }

  function handleSaved(pl: any) {
    setPriceLists(prev => {
      const idx = prev.findIndex(x => x.id === pl.id)
      return idx >= 0 ? prev.map(x => x.id === pl.id ? pl : x) : [pl, ...prev]
    })
    setModalOpen(false)
  }

  async function deleteList(id: string) {
    if (!confirm('Supprimer cette liste de prix ? Les clients liés n\'en auront plus.')) return
    await fetch(`/api/admin/price-lists?id=${id}`, { method: 'DELETE' })
    setPriceLists(prev => prev.filter(pl => pl.id !== id))
  }

  const stats = {
    total: priceLists.length,
    withDiscount: priceLists.filter(pl => pl.discount_percent > 0).length,
    withFreeShipping: priceLists.filter(pl => pl.free_shipping).length,
    withProductRules: priceLists.filter(pl => pl.rules?.some((r: any) => r.rule_type === 'product')).length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Listes de prix', value: stats.total, color: 'text-slate-900' },
          { label: 'Avec remise globale', value: stats.withDiscount, color: 'text-green-600' },
          { label: 'Port gratuit', value: stats.withFreeShipping, color: 'text-blue-600' },
          { label: 'Règles produit', value: stats.withProductRules, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm justify-between">
        <p className="text-sm font-semibold text-slate-600">Gérer les listes de prix et règles tarifaires</p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nouvelle liste de prix
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Chargement…</div>
        ) : priceLists.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune liste de prix</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre première liste de prix pour gérer des tarifs personnalisés.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left">Nom</th>
                <th className="px-5 py-3 text-left">Remise globale</th>
                <th className="px-5 py-3 text-left">Port</th>
                <th className="px-5 py-3 text-left">Règles</th>
                <th className="px-5 py-3 text-left">Défaut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priceLists.map(pl => (
                <tr key={pl.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{pl.name}</p>
                    {pl.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{pl.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    {pl.discount_percent > 0 ? (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">−{pl.discount_percent}%</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {pl.free_shipping ? (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        Gratuit{pl.free_shipping_threshold > 0 ? ` dès ${pl.free_shipping_threshold}€` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {pl.rules?.length > 0 ? (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {pl.rules.length} règle{pl.rules.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {pl.is_default ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Défaut</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setExportPriceListId(pl.id); setExportTitle(pl.name) }}
                        className="p-1.5 hover:bg-sky-50 rounded-lg text-slate-400 hover:text-sky-600 transition-colors"
                        title="Liste de prix"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(pl)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteList(pl.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Supprimer">
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
      <p className="text-xs text-slate-400 text-right">{priceLists.length} liste{priceLists.length > 1 ? 's' : ''} de prix</p>

      {modalOpen && (
        <PriceListModal
          priceList={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {exportPriceListId && (
        <PriceExportModal
          priceListId={exportPriceListId}
          title={exportTitle}
          onClose={() => setExportPriceListId(null)}
        />
      )}
    </div>
  )
}
