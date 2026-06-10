'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Printer, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  banderoles: 'Banderoles', roll_up: 'Roll-up', drapeaux: 'Drapeaux',
  adhesifs: 'Adhésifs', toiles: 'Toiles', baches: 'Bâches',
  panneaux: 'Panneaux', textile: 'Textile', papier: 'Papier',
  accessoires: 'Accessoires', supports_evenementiels: 'Supports événementiels',
  vinyle_autocollant: 'Vinyle autocollant', autre: 'Autre',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtNum(n: number | null | undefined, decimals = 2) {
  if (n == null) return '—'
  return n.toFixed(decimals).replace('.', ',')
}

interface Props {
  priceListId?: string
  clientId?: string
  title: string
  onClose: () => void
}

export default function PriceExportModal({ priceListId, clientId, title, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (priceListId) params.set('price_list_id', priceListId)
    if (clientId)    params.set('client_id', clientId)
    fetch(`/api/admin/price-export?${params}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [priceListId, clientId])

  function handlePrint() {
    window.print()
  }

  const categories = data ? Object.keys(data.by_category).sort() : []

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .price-export-printable { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; overflow: visible; }
          .no-print { display: none !important; }
          .print-page-break { page-break-before: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col">

          {/* Header */}
          <div className="no-print flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Liste de prix</h2>
              <p className="text-sm text-slate-500 mt-0.5">{title}</p>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer / PDF
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div ref={printRef} className="price-export-printable px-6 py-5 space-y-6">

            {loading && (
              <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calcul des tarifs en cours…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
            )}

            {data && (
              <>
                {/* En-tête document */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">LISTE DE PRIX</h1>
                    {data.client && (
                      <p className="text-base font-semibold text-slate-700 mt-1">{data.client.name}</p>
                    )}
                    {data.price_list && (
                      <p className="text-sm text-slate-500">
                        Tarif : <strong className="text-slate-700">{data.price_list.name}</strong>
                        {data.price_list.discount_percent > 0 && (
                          <span className="ml-2 text-green-700 font-semibold">−{data.price_list.discount_percent}%</span>
                        )}
                      </p>
                    )}
                    {!data.price_list && data.applied_discount > 0 && (
                      <p className="text-sm text-slate-500">Remise appliquée : <strong className="text-green-700">−{data.applied_discount}%</strong></p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="font-bold text-slate-600">Comink</p>
                    <p>comink.be</p>
                    <p className="mt-1">Prix HTVA en EUR</p>
                    <p>Généré le {new Date(data.generated_at).toLocaleDateString('fr-BE')}</p>
                  </div>
                </div>

                {/* Note */}
                <div className="no-print bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  <strong>Note :</strong> Les prix sur mesure sont indiqués au m². Les finitions par défaut sont incluses dans le calcul. Cliquez sur une catégorie pour la déplier/replier.
                </div>

                {/* Tableau par catégorie */}
                {categories.map((cat, catIdx) => {
                  const rows: any[] = data.by_category[cat]
                  const isOpen = !collapsed[cat]
                  return (
                    <div key={cat} className={catIdx > 0 ? 'print-page-break-avoid' : ''}>
                      {/* Titre catégorie */}
                      <button
                        className="no-print w-full flex items-center gap-2 text-left px-1 py-2 hover:bg-slate-50 rounded-lg group transition-colors"
                        onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">({rows.length} produit{rows.length > 1 ? 's' : ''})</span>
                      </button>
                      {/* Print-only category header */}
                      <div className="hidden print:block">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </h2>
                      </div>

                      {isOpen && (
                        <div className="rounded-xl border border-slate-200 overflow-hidden mt-1">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Produit</th>
                                <th className="px-4 py-2.5 text-left">Format / Config</th>
                                <th className="px-4 py-2.5 text-right">Prix HTVA</th>
                                <th className="px-4 py-2.5 text-right">Prix/m²</th>
                                <th className="px-4 py-2.5 text-right">TVA</th>
                                <th className="px-4 py-2.5 text-right">Prix TTC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rows.map((row: any, idx: number) => {
                                if (row.product_type === 'taille_standard') {
                                  return row.sizes?.length > 0 ? (
                                    row.sizes.map((s: any, si: number) => (
                                      <tr key={`${row.id}-${si}`} className={si % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                        {si === 0 ? (
                                          <td className="px-4 py-2.5 font-semibold text-slate-800 align-top" rowSpan={row.sizes.length}>
                                            {row.name}
                                            {row.finition_supp > 0 && (
                                              <p className="text-xs text-slate-400 font-normal mt-0.5">Finitions incluses</p>
                                            )}
                                          </td>
                                        ) : null}
                                        <td className="px-4 py-2.5 text-slate-600 text-xs">
                                          <span className="font-medium text-slate-700">{s.name}</span>
                                          <span className="text-slate-400 ml-1">· {fmtNum(s.width_cm, 0)}×{fmtNum(s.height_cm, 0)} cm</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmt(s.price_net)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-500 text-xs">{s.price_per_m2 ? `${fmt(s.price_per_m2)}/m²` : '—'}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-400 text-xs">{row.vat_rate}%</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{fmt(s.price_ttc)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                      <td className="px-4 py-2.5 font-semibold text-slate-800" colSpan={6}>{row.name} — aucune taille configurée</td>
                                    </tr>
                                  )
                                }

                                // Sur mesure
                                return (
                                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                                      {row.name}
                                      {row.finition_supp > 0 && (
                                        <p className="text-xs text-slate-400 font-normal mt-0.5">+ finitions défaut incluses</p>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500">
                                      <span className="bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full text-[11px]">Sur mesure</span>
                                      {row.max_width_cm && (
                                        <p className="mt-0.5 text-slate-400">
                                          Min {fmtNum(row.ref_width_cm, 0)}×{fmtNum(row.ref_height_cm, 0)} cm
                                          {' · '}Max {fmtNum(row.max_width_cm, 0)}×{fmtNum(row.max_height_cm, 0)} cm
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <p className="font-bold text-slate-800">{fmt(row.price_per_m2_net)}<span className="font-normal text-slate-400 text-xs">/m²</span></p>
                                      <p className="text-xs text-slate-400 mt-0.5">Réf. {fmtNum(row.ref_width_cm, 0)}×{fmtNum(row.ref_height_cm, 0)} cm → {fmt(row.ref_price_net)}</p>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmt(row.price_per_m2_net)}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-400 text-xs">{row.vat_rate}%</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                      {fmt(row.price_per_m2_ttc)}<span className="font-normal text-slate-400 text-xs">/m²</span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Pied de page */}
                <div className="text-xs text-slate-400 border-t border-slate-200 pt-4 flex justify-between">
                  <p>{data.products.length} produit{data.products.length > 1 ? 's' : ''} · Prix HTVA en EUR · TVA non incluse sauf indication TTC</p>
                  <p>Tarifs non contractuels — valables sous réserve de disponibilité</p>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
