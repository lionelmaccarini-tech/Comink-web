'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, Plus, ChevronDown } from 'lucide-react'

interface ShippingAddress {
  id: string
  label?: string
  line1: string
  line2?: string
  city: string
  postal_code?: string
  country: string
  is_default: boolean
}

interface Props {
  /** Profile ID of the selected client — used to load their saved addresses */
  clientId?: string
  /** Currently selected/typed delivery address string */
  value: string
  onChange: (address: string) => void
  /** Delivery country — updated when an address is picked */
  onCountryChange?: (country: string) => void
}

function formatAddress(a: ShippingAddress): string {
  const parts = [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country]
  return parts.filter(Boolean).join(', ')
}

const CUSTOM_VALUE = '__custom__'
const NONE_VALUE   = '__none__'

export default function DeliveryAddressPicker({ clientId, value, onChange, onCountryChange }: Props) {
  const [addresses,    setAddresses]    = useState<ShippingAddress[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selectedId,   setSelectedId]   = useState<string>(NONE_VALUE)

  // Load client's saved addresses when clientId changes
  useEffect(() => {
    if (!clientId) {
      setAddresses([])
      setSelectedId(NONE_VALUE)
      return
    }
    setLoading(true)
    fetch(`/api/crm/clients/${clientId}/addresses`)
      .then(r => r.json())
      .then((data: ShippingAddress[]) => {
        if (!Array.isArray(data)) return
        setAddresses(data)
        // Auto-select the default address if no value is set yet
        const def = data.find(a => a.is_default) ?? data[0]
        if (def && !value) {
          setSelectedId(def.id)
          onChange(formatAddress(def))
          if (onCountryChange) onCountryChange(def.country)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedId(id)
    if (id === NONE_VALUE || id === CUSTOM_VALUE) {
      onChange('')
      return
    }
    const addr = addresses.find(a => a.id === id)
    if (addr) {
      onChange(formatAddress(addr))
      if (onCountryChange) onCountryChange(addr.country)
    }
  }

  const isCustom = selectedId === CUSTOM_VALUE || (selectedId === NONE_VALUE && !clientId)
  const showSelector = clientId || addresses.length > 0

  return (
    <div className="space-y-2">
      {showSelector && (
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedId}
            onChange={handleSelectChange}
            disabled={loading}
            className="w-full appearance-none pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value={NONE_VALUE}>— Choisir une adresse —</option>
            {addresses.map(a => (
              <option key={a.id} value={a.id}>
                {a.label ? `${a.label} — ` : ''}{a.line1}, {[a.postal_code, a.city].filter(Boolean).join(' ')}
                {a.is_default ? ' ★' : ''}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>✎ Saisir une autre adresse…</option>
          </select>
          {loading && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-slate-400">chargement…</span>
          )}
        </div>
      )}

      {/* Free-text input for custom address or when no client is selected */}
      {(isCustom || !showSelector) && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          placeholder={
            showSelector
              ? 'Saisissez l\'adresse complète (rue, code postal, ville, pays)…'
              : 'Adresse de livraison (rue, code postal, ville, pays)…'
          }
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* If an existing address is selected, show it formatted */}
      {!isCustom && selectedId !== NONE_VALUE && value && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
          {value}
          <button
            type="button"
            onClick={() => { setSelectedId(CUSTOM_VALUE); }}
            className="ml-2 text-blue-500 hover:underline"
          >
            <Plus className="w-3 h-3 inline" /> modifier
          </button>
        </p>
      )}

      {/* No addresses found */}
      {clientId && !loading && addresses.length === 0 && (
        <p className="text-xs text-slate-400">
          Ce client n'a pas encore d'adresse enregistrée.
        </p>
      )}
    </div>
  )
}
