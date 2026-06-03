'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react'

const LOGO_URL =
  'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

interface QuoteItem {
  description?: string
  details?: string
  quantity?: number
  unit_price_ht?: number
  unit_price?: number
  total_price?: number
  width_cm?: number
  height_cm?: number
}

interface QuoteData {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  client_company?: string
  reference?: string
  items: QuoteItem[]
  subtotal?: number
  tax?: number
  total?: number
  notes?: string
  valid_until?: string
  pipeline_stage: string
  status?: string
  created_at: string
}

export default function QuoteViewPage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const [alreadyAccepted, setAlreadyAccepted] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/devis/view/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setQuote(data)
          if (data.pipeline_stage === 'won' || data.status === 'accepted') {
            setAlreadyAccepted(true)
          }
        }
      })
      .catch(() => setError('Impossible de charger le devis.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleValidate = async () => {
    if (!quote) return
    setValidating(true)
    try {
      const res = await fetch(`/api/crm/quotes/${quote.id}/validate-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: token }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.already_accepted) {
          setAlreadyAccepted(true)
        } else {
          alert(data.error || 'Erreur lors de la validation')
        }
        return
      }

      // Injecter les items dans le localStorage du panier
      const cartState = {
        state: {
          items: data.cart_items,
          // Pré-remplir nom/email si disponibles
          _quote_client_name: data.client_name,
          _quote_client_email: data.client_email,
        },
        version: 0,
      }
      localStorage.setItem('comink_cart', JSON.stringify(cartState))
      setValidated(true)

      // Redirection vers le panier après 1 seconde
      setTimeout(() => {
        router.push('/panier')
      }, 1000)
    } catch {
      alert('Erreur lors de la validation. Veuillez réessayer.')
    } finally {
      setValidating(false)
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Devis introuvable</h1>
          <p className="text-slate-500 text-sm">{error || 'Ce lien de devis est invalide ou a expiré.'}</p>
        </div>
      </div>
    )
  }

  const lines: QuoteItem[] = Array.isArray(quote.items) ? quote.items : []
  const validUntil = quote.valid_until ? fmtDate(quote.valid_until) : null

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src={LOGO_URL}
            alt="Comink"
            width={140}
            height={44}
            className="mx-auto"
            unoptimized
          />
        </div>

        {/* Already accepted */}
        {alreadyAccepted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 className="font-bold text-emerald-800 text-lg mb-1">Ce devis a déjà été validé</h2>
            <p className="text-emerald-600 text-sm">Votre commande est en cours de traitement.</p>
          </div>
        )}

        {/* Validated confirmation */}
        {validated && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 className="font-bold text-emerald-800 text-lg mb-1">Devis ajouté au panier !</h2>
            <p className="text-emerald-600 text-sm">Redirection vers le panier...</p>
          </div>
        )}

        {/* Quote card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-[#1e3a5f] px-6 py-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Devis</p>
                <h1 className="text-white text-2xl font-bold">{quote.quote_number}</h1>
                <p className="text-blue-200 text-sm mt-1">
                  Établi le {fmtDate(quote.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs mb-1">Total TTC</p>
                <p className="text-white text-3xl font-bold">{fmt(quote.total ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Client</p>
                <p className="font-semibold text-slate-800">{quote.client_name}</p>
                {quote.client_company && (
                  <p className="text-sm text-slate-500">{quote.client_company}</p>
                )}
              </div>
              {quote.reference && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Votre référence</p>
                  <p className="text-slate-700">{quote.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-14">Qté</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">P.U. HT</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, i) => {
                  const unitPrice = line.unit_price_ht ?? line.unit_price ?? 0
                  const qty = line.quantity ?? 1
                  const dims =
                    line.width_cm && line.height_cm
                      ? ` — ${line.width_cm} × ${line.height_cm} cm`
                      : ''
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3">
                        <p className="font-medium text-slate-800">
                          {line.description || ''}
                          {dims && <span className="text-slate-400 font-normal">{dims}</span>}
                        </p>
                        {line.details && (
                          <p className="text-xs text-slate-400 mt-0.5">{line.details}</p>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-600">{qty}</td>
                      <td className="py-3 text-right text-slate-600">{fmt(unitPrice)}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{fmt(qty * unitPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                {quote.subtotal != null ? (
                  <tr>
                    <td colSpan={3} className="pt-3 pb-1 text-right text-sm text-slate-500">Sous-total HT</td>
                    <td className="pt-3 pb-1 text-right text-sm font-medium text-slate-700">{fmt(quote.subtotal ?? 0)}</td>
                  </tr>
                ) : null}
                {quote.tax != null ? (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-sm text-slate-500">TVA</td>
                    <td className="py-1 text-right text-sm text-slate-600">{fmt(quote.tax ?? 0)}</td>
                  </tr>
                ) : null}
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-2 py-3 text-right font-bold text-slate-800">Total TTC</td>
                  <td className="px-2 py-3 text-right font-bold text-xl text-[#1e3a5f]">{fmt(quote.total ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Validity notice */}
          {validUntil && (
            <div className="px-6 pb-2">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                Ce devis est valable jusqu'au <strong>{validUntil}</strong>
              </p>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pb-4">
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold mb-1 text-slate-700">Remarques</p>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </div>
          )}

          {/* CTA */}
          {!alreadyAccepted && !validated && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="w-full flex items-center justify-center gap-2.5 bg-[#1e3a5f] hover:bg-[#162e4d] text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-60 text-base"
              >
                {validating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                {validating ? 'Validation en cours...' : 'Valider ce devis et commander'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                En validant, les articles de ce devis seront ajoutés à votre panier avec les prix convenus.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-slate-400 space-y-1">
          <p>Comink — Rue de Bruxelles 174h, 4340 Awans, Belgique</p>
          <p>+32 4 233 01 38 · info@comink.be</p>
          <p className="mt-2">
            <a href="https://comink.be" className="hover:text-slate-600 transition-colors">comink.be</a>
          </p>
        </div>

      </div>
    </div>
  )
}
