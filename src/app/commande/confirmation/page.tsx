'use client'

import React, { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

interface WireBankInfo {
  wire_iban: string
  wire_bic: string
  wire_beneficiary: string
}

function WireConfirmation({ orderRef }: { orderRef: string }) {
  const [bank, setBank] = useState<WireBankInfo | null>(null)

  useEffect(() => {
    fetch('/api/settings/payment-delivery')
      .then(r => r.json())
      .then(d => {
        setBank({
          wire_iban:        d?.payment?.wire_iban        || '',
          wire_bic:         d?.payment?.wire_bic         || '',
          wire_beneficiary: d?.payment?.wire_beneficiary || 'Comink SRL',
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md w-full">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-5" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Commande enregistrée !</h1>
        <p className="text-slate-500 text-sm mb-6">
          Votre commande <span className="font-bold text-slate-700">#{orderRef}</span> est confirmée.
          Veuillez effectuer un virement avec les coordonnées suivantes :
        </p>

        {bank === null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3 mb-6">
            <InfoRow label="Bénéficiaire" value={bank.wire_beneficiary} />
            <InfoRow label="IBAN"         value={bank.wire_iban || '—'} mono />
            <InfoRow label="BIC"          value={bank.wire_bic  || '—'} mono />
            <InfoRow label="Communication" value={orderRef} mono />
          </div>
        )}

        <p className="text-xs text-slate-500 mb-6">
          Votre commande sera traitée dès réception du virement.
        </p>

        <div className="space-y-3">
          <Link href="/compte" className="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Suivre ma commande
          </Link>
          <Link href="/" className="block text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Questions ? <a href="tel:+3242330138" className="text-blue-600 hover:underline">+32 4 233 01 38</a>
        </p>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-semibold text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-sm text-slate-800 text-right ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}

function DefaultConfirmation() {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md w-full">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-5" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Commande confirmée !</h1>
        <p className="text-slate-500 text-sm mb-6">
          Merci pour votre commande. Vous allez recevoir un email de confirmation. Notre équipe la traite dès maintenant.
        </p>
        <div className="space-y-3">
          <Link href="/compte" className="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Suivre ma commande
          </Link>
          <Link href="/" className="block text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Questions ? <a href="tel:+3242330138" className="text-blue-600 hover:underline">+32 4 233 01 38</a>
        </p>
      </div>
    </div>
  )
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const ref  = searchParams.get('ref') || ''
  const { clearCart } = useCart()

  // Vider le panier dès que la page de confirmation est affichée
  useEffect(() => {
    clearCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (type === 'wire') {
    return <WireConfirmation orderRef={ref} />
  }

  // alma or card (default)
  return <DefaultConfirmation />
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
