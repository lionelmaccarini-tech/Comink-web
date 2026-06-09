'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Copy, User, Loader2, CheckCircle } from 'lucide-react'
import ClientPicker, { ClientData } from './ClientPicker'

interface Props {
  quoteId: string
  quoteNumber: string
  originalClient: {
    full_name: string
    email: string
    company?: string
    phone?: string
    vat_number?: string
    billing_line1?: string
    billing_line2?: string
    billing_city?: string
    billing_postal_code?: string
    billing_country?: string
    user_id?: string
  }
  createdBy?: string
  onClose: () => void
}

export default function DuplicateQuoteModal({ quoteId, quoteNumber, originalClient, createdBy, onClose }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'same' | 'other'>('same')
  const emptyClient: ClientData = { full_name: '', email: '' }
  const [otherClient, setOtherClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDuplicate = async () => {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { created_by: createdBy ?? null }

      if (mode === 'other' && otherClient) {
        body.client_name    = otherClient.full_name
        body.client_email   = otherClient.email
        body.client_company = otherClient.company   ?? null
        body.client_phone   = otherClient.phone     ?? null
        body.vat_number     = otherClient.vat_number ?? null
        body.user_id        = otherClient.id         ?? null
        body.billing_line1       = otherClient.billing_line1       ?? null
        body.billing_line2       = otherClient.billing_line2       ?? null
        body.billing_city        = otherClient.billing_city        ?? null
        body.billing_postal_code = otherClient.billing_postal_code ?? null
        body.billing_country     = otherClient.billing_country     ?? null
      }

      const res = await fetch(`/api/crm/quotes/${quoteId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      router.push(`/crm/quotes/${data.id}`)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const canConfirm = mode === 'same' || (mode === 'other' && !!otherClient)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">Dupliquer le devis <span className="text-blue-600">{quoteNumber}</span></h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Choix du client */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Attribuer le nouveau devis à :</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('same')}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  mode === 'same'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">Même client</span>
                  {mode === 'same' && <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />}
                </div>
                <p className="text-xs text-slate-500 truncate">{originalClient.full_name}</p>
                {originalClient.company && <p className="text-xs text-slate-400 truncate">{originalClient.company}</p>}
              </button>

              <button
                type="button"
                onClick={() => setMode('other')}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  mode === 'other'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-semibold text-slate-800">Autre client</span>
                  {mode === 'other' && <CheckCircle className="w-4 h-4 text-violet-600 ml-auto" />}
                </div>
                <p className="text-xs text-slate-500">
                  {otherClient ? otherClient.full_name : 'Sélectionner un client…'}
                </p>
                {otherClient?.company && <p className="text-xs text-slate-400 truncate">{otherClient.company}</p>}
              </button>
            </div>
          </div>

          {/* ClientPicker si "autre client" */}
          {mode === 'other' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Rechercher ou créer un client :</p>
              <ClientPicker
                value={otherClient ?? emptyClient}
                onChange={(c) => setOtherClient(c)}
              />
            </div>
          )}

          {/* Résumé */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Ce qui sera copié :</p>
            <ul className="space-y-0.5 text-xs text-slate-500 list-disc list-inside">
              <li>Toutes les lignes du devis (articles, prix, finitions)</li>
              <li>Livraison et notes</li>
              <li>Statut : <strong>Brouillon</strong> — pipeline repart de <strong>Lead</strong></li>
              <li>Date de validité à redéfinir</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!canConfirm || loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Duplication…</>
            ) : (
              <><Copy className="w-4 h-4" /> Dupliquer</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
