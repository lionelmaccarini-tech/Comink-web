'use client'

import React, { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

export default function PaymentDeliveryTab() {
  // Payment
  const [cardEnabled,         setCardEnabled]         = useState(true)
  const [almaEnabled,         setAlmaEnabled]         = useState(true)
  const [wireEnabled,         setWireEnabled]         = useState(true)
  const [wireIban,            setWireIban]            = useState('')
  const [wireBic,             setWireBic]             = useState('')
  const [wireBeneficiary,     setWireBeneficiary]     = useState('Comink SRL')
  const [defaultDeadlineDays, setDefaultDeadlineDays] = useState('0')

  // Delivery
  const [pickupEnabled,    setPickupEnabled]    = useState(true)
  const [parcelEnabled,    setParcelEnabled]    = useState(true)
  const [expressEnabled,   setExpressEnabled]   = useState(true)
  const [atelierAddress,   setAtelierAddress]   = useState('')
  const [parcelBeMin,      setParcelBeMin]      = useState('25')
  const [parcelEuMin,      setParcelEuMin]      = useState('50')
  const [parcelPercent,    setParcelPercent]    = useState('4')
  const [expressMin,       setExpressMin]       = useState('100')
  const [expressPerKm,     setExpressPerKm]     = useState('3.5')

  const [savingPayment,   setSavingPayment]   = useState(false)
  const [savedPayment,    setSavedPayment]    = useState(false)
  const [savingDelivery,  setSavingDelivery]  = useState(false)
  const [savedDelivery,   setSavedDelivery]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then((d: Record<string, string>) => {
      if (d.payment_card_enabled    !== undefined) setCardEnabled(d.payment_card_enabled === 'true')
      if (d.payment_alma_enabled    !== undefined) setAlmaEnabled(d.payment_alma_enabled === 'true')
      if (d.payment_wire_enabled    !== undefined) setWireEnabled(d.payment_wire_enabled === 'true')
      if (d.payment_wire_iban)        setWireIban(d.payment_wire_iban)
      if (d.payment_wire_bic)         setWireBic(d.payment_wire_bic)
      if (d.payment_wire_beneficiary) setWireBeneficiary(d.payment_wire_beneficiary)
      if (d.payment_default_deadline_days) setDefaultDeadlineDays(d.payment_default_deadline_days)

      if (d.delivery_pickup_enabled  !== undefined) setPickupEnabled(d.delivery_pickup_enabled === 'true')
      if (d.delivery_parcel_enabled  !== undefined) setParcelEnabled(d.delivery_parcel_enabled === 'true')
      if (d.delivery_express_enabled !== undefined) setExpressEnabled(d.delivery_express_enabled === 'true')
      if (d.delivery_atelier_address) setAtelierAddress(d.delivery_atelier_address)
      if (d.delivery_parcel_be_min)   setParcelBeMin(d.delivery_parcel_be_min)
      if (d.delivery_parcel_eu_min)   setParcelEuMin(d.delivery_parcel_eu_min)
      if (d.delivery_parcel_percent)  setParcelPercent(d.delivery_parcel_percent)
      if (d.delivery_express_min)     setExpressMin(d.delivery_express_min)
      if (d.delivery_express_per_km)  setExpressPerKm(d.delivery_express_per_km)
    }).catch(() => {})
  }, [])

  async function handleSavePayment() {
    setSavingPayment(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_card_enabled:           String(cardEnabled),
          payment_alma_enabled:           String(almaEnabled),
          payment_wire_enabled:           String(wireEnabled),
          payment_wire_iban:              wireIban,
          payment_wire_bic:               wireBic,
          payment_wire_beneficiary:       wireBeneficiary,
          payment_default_deadline_days:  defaultDeadlineDays,
        }),
      })
      setSavedPayment(true)
      setTimeout(() => setSavedPayment(false), 2500)
    } finally {
      setSavingPayment(false)
    }
  }

  async function handleSaveDelivery() {
    setSavingDelivery(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_pickup_enabled:  String(pickupEnabled),
          delivery_parcel_enabled:  String(parcelEnabled),
          delivery_express_enabled: String(expressEnabled),
          delivery_atelier_address: atelierAddress,
          delivery_parcel_be_min:   parcelBeMin,
          delivery_parcel_eu_min:   parcelEuMin,
          delivery_parcel_percent:  parcelPercent,
          delivery_express_min:     expressMin,
          delivery_express_per_km:  expressPerKm,
        }),
      })
      setSavedDelivery(true)
      setTimeout(() => setSavedDelivery(false), 2500)
    } finally {
      setSavingDelivery(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Modes de paiement ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-5">Modes de paiement</h3>

        <div className="space-y-4">
          <Toggle checked={cardEnabled} onChange={setCardEnabled} label="Carte bancaire (Stripe)" />
          <Toggle checked={almaEnabled} onChange={setAlmaEnabled} label="Alma paiement 3×" />
          <Toggle checked={wireEnabled} onChange={setWireEnabled} label="Virement bancaire" />
        </div>

        {wireEnabled && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Coordonnées bancaires</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bénéficiaire</label>
              <input type="text" value={wireBeneficiary} onChange={e => setWireBeneficiary(e.target.value)} className={inputCls} placeholder="Comink SRL" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN</label>
              <input type="text" value={wireIban} onChange={e => setWireIban(e.target.value)} className={inputCls} placeholder="BE12 3456 7890 1234" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">BIC</label>
              <input type="text" value={wireBic} onChange={e => setWireBic(e.target.value)} className={inputCls} placeholder="GEBABEBB" />
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Délai de paiement</p>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Délai par défaut (jours)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={defaultDeadlineDays} onChange={e => setDefaultDeadlineDays(e.target.value)}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-slate-500">jours (0 = immédiat)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSavePayment} disabled={savingPayment}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPayment ? '✓ Enregistré' : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </div>

      {/* ── Modes de livraison ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-5">Modes de livraison</h3>

        <div className="space-y-4">
          <Toggle checked={pickupEnabled}  onChange={setPickupEnabled}  label="Enlèvement atelier (gratuit)" />
          <Toggle checked={parcelEnabled}  onChange={setParcelEnabled}  label="Livraison colis 48h" />
          <Toggle checked={expressEnabled} onChange={setExpressEnabled} label="Livraison express" />
        </div>

        {pickupEnabled && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Adresse atelier</label>
            <input type="text" value={atelierAddress} onChange={e => setAtelierAddress(e.target.value)}
              className={inputCls} placeholder="Rue de Bruxelles 174h, 4340 Awans" />
          </div>
        )}

        {parcelEnabled && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tarifs colis</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Min Belgique (€)</label>
                <input type="number" min="0" step="0.5" value={parcelBeMin} onChange={e => setParcelBeMin(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Min Europe (€)</label>
                <input type="number" min="0" step="0.5" value={parcelEuMin} onChange={e => setParcelEuMin(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">% du HT</label>
                <input type="number" min="0" step="0.5" value={parcelPercent} onChange={e => setParcelPercent(e.target.value)}
                  className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {expressEnabled && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tarifs express</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Minimum (€)</label>
                <input type="number" min="0" step="0.5" value={expressMin} onChange={e => setExpressMin(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prix par km (€/km)</label>
                <input type="number" min="0" step="0.1" value={expressPerKm} onChange={e => setExpressPerKm(e.target.value)}
                  className={inputCls} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={handleSaveDelivery} disabled={savingDelivery}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            {savingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : savedDelivery ? '✓ Enregistré' : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  )
}
