'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw, Pen } from 'lucide-react'

interface DeliveryOrder {
  id: string
  order_number: string
  client_name: string
  client_email: string
  delivery_method: 'pickup' | 'parcel' | 'express'
  delivery_status: string
  delivery_cost: number
  total: number
  pickup_signed_by?: string
  pickup_signed_at?: string
  carrier_name?: string
  tracking_number?: string
  carrier_handoff_at?: string
  created_at: string
  metadata?: { ship_in_client_name?: boolean; [key: string]: unknown }
}

interface Props {
  userRole: string
}

// ─── Inline SignatureCanvas ──────────────────────────────────────────────────

function SignatureCanvas({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasSigned, setHasSigned] = useState(false)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const pos = getPos(e)
      lastPos.current = pos
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!drawing.current || !lastPos.current) return
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPos.current = pos
      if (!hasSigned) {
        setHasSigned(true)
        onSign(canvas.toDataURL())
      } else {
        onSign(canvas.toDataURL())
      }
    }

    const stop = () => {
      drawing.current = false
      lastPos.current = null
      if (canvasRef.current) onSign(canvasRef.current.toDataURL())
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stop)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stop)
    }
  }, [onSign, hasSigned])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
    onSign('')
  }

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        <canvas
          ref={canvasRef}
          width={500}
          height={140}
          className="w-full touch-none cursor-crosshair"
          style={{ maxHeight: 140 }}
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
              <Pen className="w-4 h-4" /> Signez ici
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Effacer la signature
      </button>
    </div>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-slate-100 text-slate-600',
    delivered: 'bg-slate-100 text-slate-600',
    handed_to_carrier: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
  }
  const labels: Record<string, string> = {
    pending: 'En production',
    ready: 'Prêt',
    picked_up: 'Enlevé',
    delivered: 'Livré',
    handed_to_carrier: 'Remis transporteur',
    in_transit: 'En transit',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', styles[status] ?? 'bg-slate-100 text-slate-600')}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Pickup Signing Modal ─────────────────────────────────────────────────────

interface PickupModalProps {
  order: DeliveryOrder
  onClose: () => void
  onSuccess: () => void
}

function PickupModal({ order, onClose, onSuccess }: PickupModalProps) {
  const [signedBy, setSignedBy] = useState('')
  const [signature, setSignature] = useState('')
  const [loading, setLoading] = useState(false)

  const canConfirm = signedBy.trim().length > 0 && signature.length > 0

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/production/deliveries/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pickup', signed_by: signedBy.trim(), signature }),
      })
      if (res.ok) {
        onSuccess()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Enlèvement — #{order.order_number}</h2>
          <p className="text-sm text-slate-500 mt-1">{order.client_name}</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700">
            Nom de la personne qui enlève <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={signedBy}
            onChange={e => setSignedBy(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Prénom Nom"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700">Signature <span className="text-red-500">*</span></label>
          <SignatureCanvas onSign={setSignature} />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors',
              canConfirm && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
            )}
          >
            {loading ? 'Enregistrement…' : "Confirmer l'enlèvement"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Carrier Handoff Modal ────────────────────────────────────────────────────

interface CarrierModalProps {
  order: DeliveryOrder
  onClose: () => void
  onSuccess: () => void
}

function CarrierModal({ order, onClose, onSuccess }: CarrierModalProps) {
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/production/deliveries/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'carrier',
          carrier_name: carrierName.trim(),
          tracking_number: trackingNumber.trim() || undefined,
          note: note.trim() || undefined,
        }),
      })
      if (res.ok) {
        onSuccess()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Remise transporteur — #{order.order_number}</h2>
          <p className="text-sm text-slate-500 mt-1">{order.client_name}</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700">
            Transporteur <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={carrierName}
            onChange={e => setCarrierName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="DHL, bpost, DPD…"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700">Numéro de suivi <span className="text-slate-400 font-normal">(optionnel)</span></label>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 1Z999AA10123456784"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700">Note <span className="text-slate-400 font-normal">(optionnel)</span></label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!carrierName.trim() || loading}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors',
              carrierName.trim() && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
            )}
          >
            {loading ? 'Enregistrement…' : 'Confirmer la remise'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: DeliveryOrder
  onPickup: (order: DeliveryOrder) => void
  onCarrierHandoff: (order: DeliveryOrder) => void
  onAction: (id: string, action: 'in_transit' | 'delivered') => void
}

function OrderCard({ order, onPickup, onCarrierHandoff, onAction }: OrderCardProps) {
  const methodLabels: Record<string, string> = {
    pickup: '🏪 Enlèvement',
    parcel: '📦 Colis 48h',
    express: '🚚 Express',
  }

  const dimmed = order.delivery_status === 'picked_up' || order.delivery_status === 'delivered'

  return (
    <div className={cn(
      'bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 transition-opacity',
      dimmed && 'opacity-60'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">#{order.order_number}</span>
            <span className="text-sm font-semibold text-slate-900 truncate">{order.client_name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('fr-BE')}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            {methodLabels[order.delivery_method] ?? order.delivery_method}
          </span>
          {order.metadata?.ship_in_client_name && (
            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full">
              Expédition en son nom
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={order.delivery_status} />

        {/* Pickup info */}
        {order.delivery_status === 'picked_up' && order.pickup_signed_by && (
          <span className="text-xs text-slate-400">
            par {order.pickup_signed_by} · {order.pickup_signed_at ? new Date(order.pickup_signed_at).toLocaleDateString('fr-BE') : ''}
          </span>
        )}

        {/* Carrier info */}
        {(order.delivery_status === 'handed_to_carrier' || order.delivery_status === 'in_transit') && order.carrier_name && (
          <span className="text-xs text-slate-500">
            {order.carrier_name}{order.tracking_number ? ` · ${order.tracking_number}` : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Pickup tab actions */}
        {order.delivery_method === 'pickup' && order.delivery_status === 'ready' && (
          <button
            type="button"
            onClick={() => onPickup(order)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Enregistrer l&apos;enlèvement
          </button>
        )}

        {/* Parcel/Express tab actions */}
        {(order.delivery_method === 'parcel' || order.delivery_method === 'express') && (
          <>
            {order.delivery_status === 'ready' && (
              <button
                type="button"
                onClick={() => onCarrierHandoff(order)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Remettre au transporteur
              </button>
            )}
            {order.delivery_status === 'handed_to_carrier' && (
              <button
                type="button"
                onClick={() => onAction(order.id, 'in_transit')}
                className="px-3 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors"
              >
                Marquer en transit
              </button>
            )}
            {order.delivery_status === 'in_transit' && (
              <button
                type="button"
                onClick={() => onAction(order.id, 'delivered')}
                className="px-3 py-1.5 border border-green-500 text-green-700 hover:bg-green-50 text-xs font-semibold rounded-lg transition-colors"
              >
                Marquer livré
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DeliveriesView({ userRole: _userRole }: Props) {
  const [tab, setTab] = useState<'pickup' | 'parcel' | 'express'>('pickup')
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [signingOrder, setSigningOrder] = useState<DeliveryOrder | null>(null)
  const [handoffOrder, setHandoffOrder] = useState<DeliveryOrder | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/production/deliveries?method=${tab}`)
      .then(r => r.json())
      .then((data: DeliveryOrder[]) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [tab, refreshKey])

  const handleAction = async (id: string, action: 'in_transit' | 'delivered') => {
    await fetch(`/api/production/deliveries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    refresh()
  }

  const countNonDelivered = (method: 'pickup' | 'parcel' | 'express') => {
    return orders.filter(o => o.delivery_method === method && o.delivery_status !== 'delivered' && o.delivery_status !== 'picked_up').length
  }

  const tabs: Array<{ id: 'pickup' | 'parcel' | 'express'; label: string; emoji: string }> = [
    { id: 'pickup',  label: 'Enlèvement atelier', emoji: '🏪' },
    { id: 'parcel',  label: 'Colis 48h',          emoji: '📦' },
    { id: 'express', label: 'Express',             emoji: '🚚' },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm w-fit">
        {tabs.map(t => {
          const count = countNonDelivered(t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>{t.emoji}</span> {t.label}
              {count > 0 && (
                <span className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.id ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Chargement…</div>
      ) : orders.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Aucune commande</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPickup={setSigningOrder}
              onCarrierHandoff={setHandoffOrder}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Pickup modal */}
      {signingOrder && (
        <PickupModal
          order={signingOrder}
          onClose={() => setSigningOrder(null)}
          onSuccess={refresh}
        />
      )}

      {/* Carrier handoff modal */}
      {handoffOrder && (
        <CarrierModal
          order={handoffOrder}
          onClose={() => setHandoffOrder(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
