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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09111f' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00AEEF' }} />
      </div>
    )
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
        <div
          className="rounded-2xl p-8 text-center max-w-md w-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-white mb-2">Devis introuvable</h1>
          <p className="text-slate-400 text-sm">{error || 'Ce lien de devis est invalide ou a expiré.'}</p>
        </div>
      </div>
    )
  }

  const lines: QuoteItem[] = Array.isArray(quote.items) ? quote.items : []
  const validUntil = quote.valid_until ? fmtDate(quote.valid_until) : null

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#09111f' }}>
      <div className="max-w-3xl mx-auto">

        {/* Logo + barre CMYK */}
        <div className="text-center mb-8">
          <Image
            src={LOGO_URL}
            alt="Comink"
            width={140}
            height={44}
            className="mx-auto mb-4"
            unoptimized
          />
          {/* Barre CMYK décorative */}
          <div className="flex h-1 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="flex-1" style={{ background: '#00AEEF' }} />
            <div className="flex-1" style={{ background: '#E8001A' }} />
            <div className="flex-1" style={{ background: '#F5C400' }} />
            <div className="flex-1" style={{ background: '#09111f', border: '1px solid rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        {/* Already accepted */}
        {alreadyAccepted && (
          <div
            className="rounded-2xl p-6 text-center mb-6"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="font-bold text-emerald-400 text-lg mb-1">Ce devis a déjà été validé</h2>
            <p className="text-emerald-400 text-sm opacity-80">Votre commande est en cours de traitement.</p>
          </div>
        )}

        {/* Validated confirmation */}
        {validated && (
          <div
            className="rounded-2xl p-6 text-center mb-6"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="font-bold text-emerald-400 text-lg mb-1">Devis ajouté au panier !</h2>
            <p className="text-emerald-400 text-sm opacity-80">Redirection vers le panier...</p>
          </div>
        )}

        {/* Quote card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >

          {/* Header */}
          <div className="px-6 py-5" style={{ background: '#0d1f38' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#00AEEF' }}>Devis</p>
                <h1 className="text-white text-2xl font-black">{quote.quote_number}</h1>
                <p className="text-slate-300 text-sm mt-1">
                  Établi le {fmtDate(quote.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs mb-1">Total TTC</p>
                <p className="text-white text-3xl font-bold">{fmt(quote.total ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* Client info */}
          <div
            className="px-6 py-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Client</p>
                <p className="font-semibold text-white">{quote.client_name}</p>
                {quote.client_company && (
                  <p className="text-sm text-slate-400">{quote.client_company}</p>
                )}
              </div>
              {quote.reference && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Votre référence</p>
                  <p className="text-slate-300">{quote.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                  <th className="pb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-14">Qté</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">P.U. HT</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {lines.map((line, i) => {
                  const unitPrice = line.unit_price_ht ?? line.unit_price ?? 0
                  const qty = line.quantity ?? 1
                  const dims =
                    line.width_cm && line.height_cm
                      ? ` — ${line.width_cm} × ${line.height_cm} cm`
                      : ''
                  return (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="py-3">
                        <p className="font-medium text-white">
                          {line.description || ''}
                          {dims && <span className="text-slate-400 font-normal">{dims}</span>}
                        </p>
                        {line.details && (
                          <p className="text-xs text-slate-400 mt-0.5">{line.details}</p>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-300">{qty}</td>
                      <td className="py-3 text-right text-slate-300">{fmt(unitPrice)}</td>
                      <td className="py-3 text-right font-semibold text-white">{fmt(qty * unitPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                {quote.subtotal != null ? (
                  <tr>
                    <td colSpan={3} className="pt-3 pb-1 text-right text-sm text-slate-400">Sous-total HT</td>
                    <td className="pt-3 pb-1 text-right text-sm font-medium text-slate-300">{fmt(quote.subtotal ?? 0)}</td>
                  </tr>
                ) : null}
                {quote.tax != null ? (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-sm text-slate-400">TVA</td>
                    <td className="py-1 text-right text-sm text-slate-300">{fmt(quote.tax ?? 0)}</td>
                  </tr>
                ) : null}
                <tr style={{ background: '#0d1f38' }}>
                  <td colSpan={3} className="px-2 py-3 text-right font-bold text-white">Total TTC</td>
                  <td className="px-2 py-3 text-right font-bold text-xl" style={{ color: '#00AEEF' }}>{fmt(quote.total ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Validity notice */}
          {validUntil && (
            <div className="px-6 pb-2">
              <p
                className="text-sm rounded-lg px-4 py-2"
                style={{ background: 'rgba(245,196,0,0.1)', border: '1px solid rgba(245,196,0,0.2)', color: '#F5C400' }}
              >
                Ce devis est valable jusqu'au <strong>{validUntil}</strong>
              </p>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pb-4">
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="font-semibold mb-1 text-slate-300">Remarques</p>
                <p className="whitespace-pre-wrap text-slate-400">{quote.notes}</p>
              </div>
            </div>
          )}

          {/* CTA */}
          {!alreadyAccepted && !validated && (
            <div
              className="px-6 pb-6 pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={handleValidate}
                disabled={validating}
                className="w-full flex items-center justify-center gap-2.5 text-white font-bold py-4 px-6 rounded-xl transition-opacity disabled:opacity-60 text-base hover:opacity-90"
                style={{ background: '#00AEEF' }}
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
            <a href="https://comink.be" className="hover:text-slate-300 transition-colors" style={{ color: '#00AEEF' }}>comink.be</a>
          </p>
        </div>

      </div>
    </div>
  )
}
