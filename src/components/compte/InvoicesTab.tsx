'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, RefreshCw, Download, Loader2 } from 'lucide-react'
import type { OdooInvoice, PartnerFollowupInfo } from '@/lib/odoo/client'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const fmtAmount = (n: number): string =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

// ─── Payment state badge ──────────────────────────────────────────────────────

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  paid:       { label: 'Payé',     className: 'bg-green-100 text-green-700 border-green-200' },
  in_payment: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  partial:    { label: 'Partiel',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
  not_paid:   { label: 'Impayé',   className: 'bg-red-100 text-red-700 border-red-200' },
  reversed:   { label: 'Annulé',   className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function isOverdue(inv: OdooInvoice): boolean {
  if (inv.payment_state === 'paid' || inv.payment_state === 'reversed') return false
  if (!inv.invoice_date_due) return false
  return new Date(inv.invoice_date_due) < new Date()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 bg-slate-100 rounded-lg" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<OdooInvoice[]>([])
  const [dunning, setDunning] = useState<PartnerFollowupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const downloadPdf = async (inv: OdooInvoice) => {
    setDownloadingId(inv.id)
    try {
      const res = await fetch(`/api/account/invoices/${inv.id}/pdf`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || 'Impossible de télécharger la facture.')
        return
      }
      const blob = await res.blob()
      const safeName = (inv.name || `facture-${inv.id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors du téléchargement.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [invRes, dunRes] = await Promise.all([
        fetch('/api/account/invoices'),
        fetch('/api/account/dunning'),
      ])
      if (invRes.ok) {
        const data = await invRes.json()
        setInvoices(data.invoices ?? [])
      }
      if (dunRes.ok) {
        setDunning(await dunRes.json())
      }
    } catch {
      setError('Impossible de charger les factures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const unpaidCount = invoices.filter(
    inv => inv.payment_state !== 'paid' && inv.payment_state !== 'reversed',
  ).length

  const totalDue = invoices.reduce((sum, inv) => sum + (inv.amount_residual ?? 0), 0)

  return (
    <div className="space-y-4">

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-base">Mes Factures</h2>
            {!loading && unpaidCount > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                {unpaidCount} impayée{unpaidCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            title="Rafraîchir"
            className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-5">

          {/* Blocage niveau 2 */}
          {dunning?.level === 2 && (
            <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Votre compte est temporairement bloqué.</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Montant dû : <strong>{fmtAmount(dunning.overdue_amount)}</strong>.
                  Veuillez régulariser votre situation pour passer de nouvelles commandes.
                </p>
              </div>
            </div>
          )}

          {/* Rappel niveau 1 */}
          {dunning?.level === 1 && (
            <div className="mb-4 flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-700">Rappel de paiement</p>
                <p className="text-sm text-orange-600 mt-0.5">
                  Vous avez des factures en retard d'un montant de <strong>{fmtAmount(dunning.overdue_amount)}</strong>.
                  {dunning.oldest_due_date && (
                    <> Échéance la plus ancienne : {fmtDate(dunning.oldest_due_date)}.</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && <Skeleton />}

          {/* Empty */}
          {!loading && !error && invoices.length === 0 && (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucune facture trouvée.</p>
            </div>
          )}

          {/* Table */}
          {!loading && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    <th className="pb-2 pr-4">Facture</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Échéance</th>
                    <th className="pb-2 pr-4">Référence</th>
                    <th className="pb-2 pr-4 text-right">Total TTC</th>
                    <th className="pb-2 pr-4 text-right">Restant dû</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2 text-center w-16">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const overdue = isOverdue(inv)
                    const badge = overdue
                      ? { label: 'En retard', className: 'bg-red-100 text-red-700 border-red-200' }
                      : (PAYMENT_BADGE[inv.payment_state] ?? PAYMENT_BADGE.not_paid)
                    return (
                      <tr
                        key={inv.id}
                        className={`border-b border-slate-50 last:border-0 ${overdue ? 'bg-red-50/40' : ''}`}
                      >
                        <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {inv.name}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                          {fmtDate(inv.invoice_date)}
                        </td>
                        <td className={`py-2.5 pr-4 whitespace-nowrap ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                          {fmtDate(inv.invoice_date_due)}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs">
                          {inv.ref || '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {fmtAmount(inv.amount_total)}
                        </td>
                        <td className={`py-2.5 pr-4 text-right font-bold whitespace-nowrap ${inv.amount_residual > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {fmtAmount(inv.amount_residual)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => downloadPdf(inv)}
                            disabled={downloadingId === inv.id}
                            title="Télécharger le PDF"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-40"
                          >
                            {downloadingId === inv.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Footer total */}
              {totalDue > 0 && (
                <div className="mt-3 flex justify-end">
                  <p className="text-sm font-bold text-red-600">
                    Total dû : {fmtAmount(totalDue)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer sync */}
          <p className="mt-4 text-[10px] text-slate-300 text-right">
            Factures synchronisées depuis Odoo
          </p>
        </div>
      </div>
    </div>
  )
}
