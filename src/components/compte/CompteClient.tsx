'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package, Clock, CheckCircle, Truck, User, LogOut, FileText, ShoppingCart, Trash2, AlertTriangle, Pencil, Plus, Star, ChevronDown, ChevronUp, Printer, X, ArrowLeft, Users, Crown, UserPlus, Mail, Shield, UserMinus } from 'lucide-react'
import { formatDate, formatPrice, isBelgianVAT, isIntraCommunityVAT, isValidVAT } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/useCart'
import type { Order } from '@/types'
import InvoicesTab from './InvoicesTab'

interface ProductionStatusDisplay {
  id: string
  name: string
  color: string
  sort_order: number
  is_initial: boolean
  is_final: boolean
}

interface ProductionLineDisplay {
  id: string
  product_name: string
  width_cm?: number | null
  height_cm?: number | null
  quantity: number
  file_thumb?: string | null
  status?: ProductionStatusDisplay
  status_id: string
}

function OrderProgressPanel({ orderId }: { orderId: string }) {
  const [lines, setLines] = useState<ProductionLineDisplay[]>([])
  const [allStatuses, setAllStatuses] = useState<ProductionStatusDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [linesRes, statusesRes] = await Promise.all([
          fetch(`/api/production/lines/client?order_id=${orderId}`),
          fetch('/api/production/statuses'),
        ])
        if (!cancelled) {
          if (linesRes.ok) setLines(await linesRes.json())
          if (statusesRes.ok) setAllStatuses(await statusesRes.json())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId])

  if (loading) return <div className="py-4 text-center text-xs text-slate-400">Chargement du suivi…</div>

  if (lines.length === 0) {
    return <p className="text-xs text-slate-400 py-2">Aucun suivi de production disponible pour cette commande.</p>
  }

  return (
    <div className="space-y-4 pt-2">
      {lines.map(line => {
        const lineStatus = line.status
        const sortedStatuses = [...allStatuses].sort((a, b) => a.sort_order - b.sort_order)
        const currentIdx = sortedStatuses.findIndex(s => s.id === line.status_id)
        const isFinal = lineStatus?.is_final ?? false
        return (
          <div key={line.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 mb-3">
              {line.file_thumb ? (
                <img src={line.file_thumb} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Package className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{line.product_name}</p>
                {(line.width_cm || line.height_cm) && (
                  <p className="text-[10px] text-slate-400">{line.width_cm}×{line.height_cm} cm · ×{line.quantity}</p>
                )}
              </div>
              {lineStatus && (
                <span
                  className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: lineStatus.color + '22', color: lineStatus.color }}
                >
                  {isFinal ? 'Prêt' : 'En cours'}
                </span>
              )}
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {sortedStatuses.map((s, i) => {
                const done = i <= currentIdx
                const active = i === currentIdx
                return (
                  <React.Fragment key={s.id}>
                    {i > 0 && (
                      <div className={`flex-1 min-w-[12px] h-0.5 rounded-full ${done ? 'bg-[#00AEEF]' : 'bg-slate-700'}`} />
                    )}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <div
                        className={`w-3 h-3 rounded-full border-2 transition-all ${active ? 'scale-125' : ''}`}
                        style={{
                          backgroundColor: done ? s.color : '#09111f',
                          borderColor: done ? s.color : 'rgba(255,255,255,0.2)',
                        }}
                      />
                      {active && (
                        <p className="text-[9px] font-bold whitespace-nowrap" style={{ color: s.color }}>
                          {s.name}
                        </p>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {lineStatus && (
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Statut actuel : <span className="font-bold" style={{ color: lineStatus.color }}>{lineStatus.name}</span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-[#F5C400] border-[#F5C400]/30', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'text-[#00AEEF] border-[#00AEEF]/30', icon: CheckCircle },
  in_production: { label: 'En production', color: 'text-purple-400 border-purple-400/30', icon: Package },
  ready: { label: 'Prête', color: 'text-emerald-400 border-emerald-400/30', icon: CheckCircle },
  shipped: { label: 'Expédiée', color: 'text-[#00AEEF] border-[#00AEEF]/30', icon: Truck },
  delivered: { label: 'Livrée', color: 'text-emerald-400 border-emerald-400/30', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'text-red-400 border-red-400/30', icon: LogOut },
}

const QUOTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'En attente', color: 'text-[#F5C400] border-[#F5C400]/30' },
  sent: { label: 'Envoyé', color: 'text-[#00AEEF] border-[#00AEEF]/30' },
  accepted: { label: 'Accepté', color: 'text-emerald-400 border-emerald-400/30' },
  refused: { label: 'Refusé', color: 'text-red-400 border-red-400/30' },
  expired: { label: 'Expiré', color: 'text-slate-400 border-slate-600' },
}

interface ShippingAddress {
  id: string
  label: string
  name: string
  line1: string
  line2?: string
  city: string
  postal_code?: string
  country: string
  is_default: boolean
}

interface QuoteItem {
  id: string
  quote_number: string
  reference?: string
  items: any[]
  subtotal?: number
  tax?: number
  total: number
  vat_number?: string
  status: string
  created_at: string
  valid_until?: string
  delivery_method?: 'pickup' | 'parcel' | 'express' | null
  delivery_cost?: number | null
  delivery_address?: string | null
}

interface Props {
  user: any
  profile: any
  orders: Order[]
  quotes: QuoteItem[]
}

const COUNTRIES = [['BE','Belgique'],['FR','France'],['NL','Pays-Bas'],['LU','Luxembourg'],['DE','Allemagne']] as const

// ─── Composant modale détail devis ────────────────────────────────────────────

const DELIVERY_LABELS: Record<string, string> = {
  pickup:  'Enlèvement atelier',
  parcel:  'Expédition colis',
  express: 'Livraison express',
}

function QuoteDetailModal({
  quote, onClose, onRestoreCart, userName, userEmail,
}: {
  quote: QuoteItem
  onClose: () => void
  onRestoreCart: () => void
  userName: string
  userEmail: string
}) {
  const items: any[] = Array.isArray(quote.items) ? quote.items : []
  const deliveryCost = quote.delivery_cost ?? 0
  const subtotal = quote.subtotal ?? items.reduce((s, i) => s + (i.total ?? 0), 0)
  const tax = quote.tax ?? Math.round((subtotal + deliveryCost) * 0.21 * 100) / 100
  const total = quote.total ?? (subtotal + deliveryCost + tax)
  const createdAt = new Date(quote.created_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })
  const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' }) : null

  const handlePrint = () => {
    const printContent = document.getElementById('quote-print-area')
    if (!printContent) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Devis ${quote.quote_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .logo { font-size: 22px; font-weight: 900; color: #2563eb; letter-spacing: -1px; }
        .company-info { font-size: 10px; color: #64748b; text-align: right; line-height: 1.6; }
        .quote-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 11px; margin-bottom: 24px; }
        .meta span { margin-right: 20px; }
        .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
        .client-box h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #f1f5f9; }
        th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
        td { padding: 10px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 240px; }
        .totals tr td { padding: 4px 10px; }
        .totals .total-row td { font-weight: 900; font-size: 13px; color: #2563eb; border-top: 2px solid #e2e8f0; padding-top: 8px; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
      </style>
    </head><body>${printContent.innerHTML}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl" style={{ background: '#0d1f38', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header modale */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-white">Devis {quote.quote_number}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Printer className="w-4 h-4" /> Imprimer / PDF
            </button>
            <button
              onClick={onRestoreCart}
              className="flex items-center gap-1.5 text-sm font-bold text-white px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ background: '#00AEEF' }}
            >
              <ShoppingCart className="w-4 h-4" /> Valider le devis et mettre dans le panier
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone imprimable */}
        <div id="quote-print-area" className="p-6">
          {/* En-tête document */}
          <div className="header flex justify-between items-start mb-8 pb-5" style={{ borderBottom: '2px solid #00AEEF' }}>
            <div>
              <div className="text-2xl font-black tracking-tight mb-1" style={{ color: '#00AEEF' }}>COMINK</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Rue de Bruxelles 174H · 4340 Awans<br/>
                +32 4 233 01 38 · info@comink.be<br/>
                TVA : BE0535 752 576
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">DEVIS</div>
              <div className="text-sm font-semibold" style={{ color: '#00AEEF' }}>{quote.quote_number}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                <div>Émis le {createdAt}</div>
                {validUntil && <div>Valide jusqu'au {validUntil}</div>}
              </div>
            </div>
          </div>

          {/* Info client */}
          <div className="rounded-xl px-4 py-3 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Destinataire</p>
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-slate-400">{userEmail}</p>
            {quote.vat_number && <p className="text-xs text-slate-400 mt-0.5">TVA : {quote.vat_number}</p>}
            {quote.reference && <p className="text-xs text-slate-400 mt-0.5">Référence : {quote.reference}</p>}
          </div>

          {/* Tableau des articles */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0d1f38', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Désignation</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qté</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">P.U. HT</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item: any, i: number) => {
                  const qty       = item.quantity ?? 1
                  const unitPrice = item.unit_price || item.unit_price_ht || ((item.total ?? 0) / Math.max(qty, 1))
                  const widthCm   = item.width_cm ?? item.width
                  const heightCm  = item.height_cm ?? item.height
                  return (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-3 py-3 font-medium text-white">
                        {item.product_name ?? item.name ?? 'Article'}
                        {item.finitions_label && (
                          <div className="text-[11px] mt-0.5" style={{ color: '#00AEEF' }}>{item.finitions_label}</div>
                        )}
                        {!item.finitions_label && item.options && Object.keys(item.options).length > 0 && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400 text-xs">
                        {widthCm && heightCm ? `${widthCm} × ${heightCm} cm` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-300">{item.quantity ?? 1}</td>
                      <td className="px-3 py-3 text-right text-slate-300">{formatPrice(unitPrice)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-white">{formatPrice(item.total ?? item.total_price ?? 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Ligne livraison dans tableau si applicable */}
          {quote.delivery_method && (
            <div className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">
                  {DELIVERY_LABELS[quote.delivery_method] ?? quote.delivery_method}
                </span>
                {quote.delivery_address && (
                  <span className="text-slate-400 text-xs">· {quote.delivery_address}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-300">
                {deliveryCost > 0 ? `${formatPrice(deliveryCost)} HT` : 'Gratuit'}
              </span>
            </div>
          )}

          {/* Totaux */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Sous-total articles HT</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Frais de livraison HT</span>
                  <span className="font-semibold">{formatPrice(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-300">
                <span>TVA 21%</span>
                <span className="font-semibold">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-2 mt-2" style={{ color: '#00AEEF', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total TTC</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="pt-4 text-[11px] text-slate-400 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            Comink SRL · Rue de Bruxelles 174H · 4340 Awans · BE0535 752 576 · www.comink.be
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompteClient({ user, profile, orders, quotes: initialQuotes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart, addItem } = useCart()
  const [tab, setTab] = useState<'commandes' | 'devis' | 'factures' | 'profil' | 'equipe'>(
    (searchParams.get('tab') as any) || 'commandes'
  )

  // ── Équipe ──────────────────────────────────────────────────────────────────
  const [team, setTeam]               = useState<any[]>([])
  const [teamPending, setTeamPending] = useState<any[]>([])
  const [teamAccount, setTeamAccount] = useState<any>(null)
  const [myRole, setMyRole]           = useState<'owner' | 'member'>('member')
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'owner' | 'member'>('member')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  async function loadTeam() {
    setTeamLoading(true)
    try {
      const res = await fetch('/api/account/team')
      if (res.ok) {
        const data = await res.json()
        setTeam(data.members ?? [])
        setTeamPending(data.pending ?? [])
        setTeamAccount(data.account ?? null)
        setMyRole(data.myRole ?? 'member')
      }
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'equipe') loadTeam()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/account/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setInviteMsg({ ok: true, text: data.type === 'added' ? `${inviteEmail} a été ajouté à l'équipe.` : `Invitation envoyée à ${inviteEmail}.` })
      setInviteEmail('')
      setShowInviteForm(false)
      loadTeam()
    } catch (err: any) {
      setInviteMsg({ ok: false, text: err.message })
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(memberId: string, newRole: 'owner' | 'member') {
    await fetch(`/api/account/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    loadTeam()
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Retirer ce membre de l\'équipe ?')) return
    const res = await fetch(`/api/account/team/${memberId}?type=member`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) alert(data.error || 'Erreur')
    else loadTeam()
  }

  async function handleCancelInvite(inviteId: string) {
    await fetch(`/api/account/team/${inviteId}?type=invitation`, { method: 'DELETE' })
    loadTeam()
  }
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [vatNumber, setVatNumber] = useState<string>(profile?.vat_number ?? '')
  const [savingVat, setSavingVat] = useState(false)
  const [vatSaved, setVatSaved] = useState(false)

  // Données personnelles optionnelles
  const [gender,     setGender]     = useState<string>((profile as any)?.gender     ?? '')
  const [birthYear,  setBirthYear]  = useState<string>((profile as any)?.birth_year ? String((profile as any).birth_year) : '')
  const [savingDemo, setSavingDemo] = useState(false)
  const [demoSaved,  setDemoSaved]  = useState(false)

  // Adresse de facturation
  const [billingLine1,   setBillingLine1]   = useState<string>((profile as any)?.billing_line1   ?? '')
  const [billingLine2,   setBillingLine2]   = useState<string>((profile as any)?.billing_line2   ?? '')
  const [billingCity,    setBillingCity]    = useState<string>((profile as any)?.billing_city    ?? '')
  const [billingPostal,  setBillingPostal]  = useState<string>((profile as any)?.billing_postal_code ?? '')
  const [billingCountry, setBillingCountry] = useState<string>((profile as any)?.billing_country ?? 'BE')
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrSaved,  setAddrSaved]  = useState(false)

  // Adresses de livraison
  const [shippingAddrs,   setShippingAddrs]   = useState<ShippingAddress[]>([])
  const [showAddrForm,    setShowAddrForm]    = useState(false)
  const [editingAddr,     setEditingAddr]     = useState<ShippingAddress | null>(null)
  const [savingAddrForm,  setSavingAddrForm]  = useState(false)
  const [deletingAddrId,  setDeletingAddrId]  = useState<string | null>(null)

  // Champs du formulaire d'adresse
  const [fLabel,   setFLabel]   = useState('')
  const [fName,    setFName]    = useState('')
  const [fLine1,   setFLine1]   = useState('')
  const [fLine2,   setFLine2]   = useState('')
  const [fCity,    setFCity]    = useState('')
  const [fPostal,  setFPostal]  = useState('')
  const [fCountry, setFCountry] = useState('BE')

  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes)
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null)

  async function loadShippingAddrs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    setShippingAddrs((data as ShippingAddress[]) ?? [])
  }

  useEffect(() => {
    loadShippingAddrs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveAddresses() {
    setSavingAddr(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({
        billing_line1:       billingLine1 || null,
        billing_line2:       billingLine2 || null,
        billing_city:        billingCity  || null,
        billing_postal_code: billingPostal || null,
        billing_country:     billingCountry,
      }).eq('id', user.id)
      setAddrSaved(true)
      setTimeout(() => setAddrSaved(false), 2500)
    } finally {
      setSavingAddr(false)
    }
  }

  function openNewAddrForm() {
    setEditingAddr(null)
    setFLabel(''); setFName(''); setFLine1(''); setFLine2(''); setFCity(''); setFPostal(''); setFCountry('BE')
    setShowAddrForm(true)
  }

  function openEditAddrForm(addr: ShippingAddress) {
    setEditingAddr(addr)
    setFLabel(addr.label); setFName(addr.name); setFLine1(addr.line1); setFLine2(addr.line2 ?? ''); setFCity(addr.city); setFPostal(addr.postal_code ?? ''); setFCountry(addr.country)
    setShowAddrForm(true)
  }

  async function handleSaveAddrForm() {
    setSavingAddrForm(true)
    try {
      const supabase = createClient()
      const payload = {
        label:       fLabel,
        name:        fName,
        line1:       fLine1,
        line2:       fLine2 || null,
        city:        fCity,
        postal_code: fPostal || null,
        country:     fCountry,
      }
      if (editingAddr?.id) {
        await supabase.from('shipping_addresses').update(payload).eq('id', editingAddr.id)
      } else {
        await supabase.from('shipping_addresses').insert({ ...payload, user_id: user.id })
      }
      await loadShippingAddrs()
      setShowAddrForm(false)
      setEditingAddr(null)
    } finally {
      setSavingAddrForm(false)
    }
  }

  async function handleDeleteAddr(id: string) {
    if (!confirm('Supprimer cette adresse de livraison ?')) return
    setDeletingAddrId(id)
    try {
      const supabase = createClient()
      await supabase.from('shipping_addresses').delete().eq('id', id)
      await loadShippingAddrs()
    } finally {
      setDeletingAddrId(null)
    }
  }

  async function handleSetDefault(id: string) {
    const supabase = createClient()
    await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id)
    await loadShippingAddrs()
  }

  async function handleSaveVat() {
    setSavingVat(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({ vat_number: vatNumber || null }).eq('id', user.id)
      setVatSaved(true)
      setTimeout(() => setVatSaved(false), 2500)
    } finally {
      setSavingVat(false)
    }
  }

  async function handleSaveDemographics() {
    setSavingDemo(true)
    try {
      const supabase = createClient()
      const yr = birthYear ? parseInt(birthYear, 10) : null
      await supabase.from('profiles').update({
        gender:     gender     || null,
        birth_year: (yr && yr >= 1920 && yr <= 2015) ? yr : null,
      }).eq('id', user.id)
      setDemoSaved(true)
      setTimeout(() => setDemoSaved(false), 2500)
    } finally {
      setSavingDemo(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const restoreCart = (quote: QuoteItem) => {
    clearCart()
    const cartItems: any[] = Array.isArray(quote.items) ? quote.items : []
    cartItems.forEach(item => addItem({
      product_id:      item.product_id ?? '',
      // Recréer un stub produit pour affichage dans le panier (name + id)
      product:         { id: item.product_id ?? '', name: item.product_name ?? 'Produit' } as any,
      quantity:        item.quantity ?? 1,
      unit_price:      item.unit_price ?? 0,
      total_price:     item.total ?? item.total_price ?? 0,
      width_cm:        item.width ?? item.width_cm,
      height_cm:       item.height ?? item.height_cm,
      // Conserver le résumé texte des finitions pour affichage dans le panier
      finitions_label: item.finitions_label,
      // Références et fichiers depuis le devis
      reference:       item.reference   || undefined,
      file_url:        item.file_url    || undefined,
      file_name:       item.file_name   || undefined,
      file_analysis:   item.file_analysis ?? undefined,
    } as any))
    // Passer le mode de livraison du devis via l'URL
    const delivery = quote.delivery_method ?? 'parcel'
    router.push(`/panier?delivery=${delivery}`)
  }

  const deleteQuote = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return
    setDeletingQuoteId(id)
    try {
      await fetch(`/api/cart-to-quote?id=${id}`, { method: 'DELETE' })
      setQuotes(prev => prev.filter(q => q.id !== id))
    } finally {
      setDeletingQuoteId(null)
    }
  }

  const isExpired = (q: QuoteItem) =>
    q.valid_until ? new Date(q.valid_until) < new Date() : false

  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      <div style={{ background: '#0d1f38' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#00AEEF' }}>MON COMPTE</p>
            <h1 className="text-2xl font-extrabold text-white">{profile?.full_name || user.email}</h1>
            {profile?.company && <p className="text-slate-400 text-sm">{profile.company}</p>}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>

        {/* Tabs — dans le bandeau sombre */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {(['commandes', 'devis', 'factures', 'equipe', 'profil'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                tab === t
                  ? 'border-[#00AEEF] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}>
              {t === 'commandes'
                ? <><Package className="w-3.5 h-3.5" />{`Mes Commandes (${orders.length})`}</>
                : t === 'devis'
                ? <><FileText className="w-3.5 h-3.5" />{`Mes Devis (${quotes.length})`}</>
                : t === 'factures'
                ? <><ShoppingCart className="w-3.5 h-3.5" />Mes Factures</>
                : t === 'equipe'
                ? <><Users className="w-3.5 h-3.5" />Mon Équipe</>
                : <><User className="w-3.5 h-3.5" />Mon Profil</>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── COMMANDES ── */}
        {tab === 'commandes' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-4">Vous n'avez pas encore de commande.</p>
                <Link href="/catalogue" className="font-bold text-sm px-6 py-2.5 rounded-lg inline-block text-white hover:opacity-90 transition-opacity" style={{ background: '#00AEEF' }}>
                  Découvrir le catalogue
                </Link>
              </div>
            ) : (
              orders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                const isExpanded = expandedOrderId === order.id
                return (
                  <div key={order.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-white">#{order.order_number}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-extrabold text-lg" style={{ color: '#00AEEF' }}>{formatPrice(order.total)}</p>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          Suivi
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-5 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <OrderProgressPanel orderId={order.id} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── DEVIS ── */}
        {tab === 'devis' && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-4">Vous n'avez pas encore de devis sauvegardé.</p>
                <Link href="/panier" className="font-bold text-sm px-6 py-2.5 rounded-lg inline-block text-white hover:opacity-90 transition-opacity" style={{ background: '#00AEEF' }}>
                  Aller au panier
                </Link>
              </div>
            ) : (
              quotes.map(quote => {
                const statusKey = isExpired(quote) ? 'expired' : (quote.status || 'draft')
                const cfg = QUOTE_STATUS_CONFIG[statusKey] || QUOTE_STATUS_CONFIG.draft
                const itemCount = Array.isArray(quote.items) ? quote.items.length : 0
                return (
                  <div key={quote.id}
                    className="rounded-xl p-5 cursor-pointer transition-colors hover:border-[#00AEEF]/30"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <p className="font-bold text-white">{quote.quote_number}</p>
                          {quote.reference && (
                            <span className="text-xs text-slate-400 font-medium">Réf : {quote.reference}</span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Créé le {formatDate(quote.created_at)}
                          {quote.valid_until && ` · Valide jusqu'au ${formatDate(quote.valid_until)}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                        {isExpired(quote) && (
                          <p className="text-xs text-[#F5C400] font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ce devis a expiré
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="font-extrabold text-lg" style={{ color: '#00AEEF' }}>{formatPrice(quote.total)}</p>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedQuote(quote)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <FileText className="w-3.5 h-3.5" /> Voir le détail
                          </button>
                          <button
                            onClick={() => restoreCart(quote)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                            style={{ background: '#00AEEF' }}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Valider le devis et mettre dans le panier
                          </button>
                          <button
                            onClick={() => deleteQuote(quote.id)}
                            disabled={deletingQuoteId === quote.id}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Supprimer ce devis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── MODALE DÉTAIL DEVIS ── */}
        {selectedQuote && (
          <QuoteDetailModal
            quote={selectedQuote}
            onClose={() => setSelectedQuote(null)}
            onRestoreCart={() => { setSelectedQuote(null); restoreCart(selectedQuote) }}
            userName={profile?.full_name || user.email}
            userEmail={user.email}
          />
        )}

        {/* ── FACTURES ── */}
        {tab === 'factures' && <InvoicesTab />}

        {/* ── PROFIL ── */}
        {tab === 'profil' && (
          <div className="space-y-5 max-w-lg">

            {/* Infos de base (lecture seule) */}
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Informations</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Email</dt><dd className="text-slate-300">{user.email}</dd></div>
                {profile?.full_name && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Nom</dt><dd className="text-slate-300">{profile.full_name}</dd></div>}
                {profile?.company && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Société</dt><dd className="text-slate-300">{profile.company}</dd></div>}
                {profile?.phone && <div><dt className="text-xs text-slate-400 font-bold uppercase tracking-wide">Téléphone</dt><dd className="text-slate-300">{profile.phone}</dd></div>}
              </dl>
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Numéro de TVA</label>
                <p className="text-[11px] text-slate-400 mb-2">B2B — belge (BE0…) ou européen (FR…, NL…). La TVA 0% s'applique uniquement hors Belgique.</p>
                <div className="flex gap-2">
                  <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                    placeholder="BE0123456789 ou FR12345678901"
                    className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
                  <button onClick={handleSaveVat} disabled={savingVat}
                    className="px-4 py-2 text-sm font-bold disabled:opacity-50 text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: '#00AEEF' }}>
                    {vatSaved ? '✓ Enregistré' : savingVat ? '…' : 'Sauver'}
                  </button>
                </div>
                {isBelgianVAT(vatNumber) && (
                  <p className="text-[11px] mt-1.5 font-semibold flex items-center gap-1" style={{ color: '#00AEEF' }}>
                    <CheckCircle className="w-3 h-3" /> Numéro TVA belge valide — TVA 21% applicable
                  </p>
                )}
                {isIntraCommunityVAT(vatNumber) && (
                  <p className="text-[11px] text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> TVA intracommunautaire — 0% appliqué sur vos commandes
                  </p>
                )}
                {vatNumber && !isValidVAT(vatNumber) && (
                  <p className="text-[11px] text-[#F5C400] mt-1.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Format non reconnu (ex : BE0123456789 ou FR12345678901)
                  </p>
                )}
              </div>
            </div>

            {/* Données personnelles optionnelles */}
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-bold text-white mb-1 flex items-center gap-2 text-sm">
                Données personnelles optionnelles
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Ces informations sont facultatives et restent confidentielles. Elles nous aident à mieux adapter nos services.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Genre</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                  >
                    <option value="" style={{ background: '#0d1f38', color: 'white' }}>— Préfère ne pas préciser —</option>
                    <option value="M" style={{ background: '#0d1f38', color: 'white' }}>Homme</option>
                    <option value="F" style={{ background: '#0d1f38', color: 'white' }}>Femme</option>
                    <option value="NB" style={{ background: '#0d1f38', color: 'white' }}>Non-binaire</option>
                    <option value="NS" style={{ background: '#0d1f38', color: 'white' }}>Préfère ne pas préciser</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Année de naissance</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    placeholder="ex: 1985"
                    min={1920}
                    max={2005}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveDemographics}
                  disabled={savingDemo}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50 text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ background: '#00AEEF' }}
                >
                  {demoSaved ? '✓ Enregistré' : savingDemo ? '…' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* Adresse de facturation */}
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-bold text-white mb-4 text-sm">Adresse de facturation</h3>
              {(() => {
                const F = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">{label}</label>
                    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
                  </div>
                )
                return (
                  <div className="space-y-3">
                    <F label="Rue et numéro" value={billingLine1} onChange={setBillingLine1} placeholder="Rue de Bruxelles 174h" />
                    <F label="Complément" value={billingLine2} onChange={setBillingLine2} placeholder="Bte 3…" />
                    <div className="grid grid-cols-3 gap-3">
                      <F label="Code postal" value={billingPostal} onChange={setBillingPostal} placeholder="4340" />
                      <div className="col-span-2"><F label="Ville" value={billingCity} onChange={setBillingCity} placeholder="Awans" /></div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Pays</label>
                      <select value={billingCountry} onChange={e => setBillingCountry(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
                        {COUNTRIES.map(([c,l]) => <option key={c} value={c} style={{ background: '#0d1f38', color: 'white' }}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })()}
              <div className="mt-4 flex justify-end">
                <button onClick={handleSaveAddresses} disabled={savingAddr}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50 text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ background: '#00AEEF' }}>
                  {addrSaved ? '✓ Enregistrée' : savingAddr ? '…' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* Adresses de livraison */}
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-bold text-white mb-4 text-sm">Adresses de livraison</h3>

              {shippingAddrs.length === 0 && !showAddrForm ? (
                <p className="text-sm text-slate-400 mb-4">Aucune adresse de livraison enregistrée.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {shippingAddrs.map(addr => (
                    <div key={addr.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-slate-300" style={{ background: 'rgba(255,255,255,0.1)' }}>{addr.label}</span>
                          {addr.is_default && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,174,239,0.15)', color: '#00AEEF' }}>Par défaut</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white mt-0.5">{addr.name}</p>
                        <p className="text-xs text-slate-400">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                        <p className="text-xs text-slate-400">{addr.postal_code} {addr.city} · {addr.country}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          disabled={addr.is_default}
                          title="Définir par défaut"
                          className="p-1.5 text-slate-500 hover:text-[#00AEEF] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditAddrForm(addr)}
                          title="Modifier"
                          className="p-1.5 text-slate-500 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddr(addr.id)}
                          disabled={deletingAddrId === addr.id}
                          title="Supprimer"
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire inline */}
              {showAddrForm && (
                <div className="rounded-xl p-4 space-y-3 mb-4" style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.2)' }}>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {editingAddr ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                  </p>
                  {(() => {
                    const F = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">{label}</label>
                        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
                      </div>
                    )
                    return (
                      <>
                        <F label="Libellé (ex. Bureau, Domicile)" value={fLabel} onChange={setFLabel} placeholder="Bureau" />
                        <F label="Nom du destinataire" value={fName} onChange={setFName} placeholder="Jean Dupont" />
                        <F label="Rue et numéro" value={fLine1} onChange={setFLine1} placeholder="Rue de la Livraison 1" />
                        <F label="Complément (optionnel)" value={fLine2} onChange={setFLine2} placeholder="Bte 2…" />
                        <div className="grid grid-cols-3 gap-3">
                          <F label="Code postal" value={fPostal} onChange={setFPostal} placeholder="4000" />
                          <div className="col-span-2"><F label="Ville" value={fCity} onChange={setFCity} placeholder="Liège" /></div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Pays</label>
                          <select value={fCountry} onChange={e => setFCountry(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
                            {COUNTRIES.map(([c,l]) => <option key={c} value={c} style={{ background: '#0d1f38', color: 'white' }}>{l}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setShowAddrForm(false); setEditingAddr(null) }}
                            className="flex-1 font-semibold px-4 py-2 text-sm rounded-lg transition-colors text-slate-300 hover:text-white hover:bg-white/10"
                            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveAddrForm}
                            disabled={savingAddrForm || !fLabel || !fName || !fLine1 || !fCity}
                            className="flex-1 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-90"
                            style={{ background: '#00AEEF' }}
                          >
                            {savingAddrForm ? '…' : 'Enregistrer'}
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {!showAddrForm && (
                <button
                  onClick={openNewAddrForm}
                  className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#00AEEF' }}
                >
                  <Plus className="w-4 h-4" /> Ajouter une adresse
                </button>
              )}
            </div>

          </div>
        )}

        {/* ── ÉQUIPE ── */}
        {tab === 'equipe' && (
          <div className="space-y-5 max-w-2xl">

            {/* En-tête compte */}
            {teamAccount && (
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#00AEEF' }}>Compte client</p>
                    <h2 className="text-lg font-extrabold text-white">{teamAccount.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{teamAccount.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                      myRole === 'owner'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-white/10 text-slate-300 border border-white/10'
                    }`}>
                      {myRole === 'owner' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {myRole === 'owner' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Message retour invitation */}
            {inviteMsg && (
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
                inviteMsg.ok
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/15 text-red-400 border border-red-500/20'
              }`}>
                {inviteMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {inviteMsg.text}
              </div>
            )}

            {/* Membres actifs */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: '#00AEEF' }} />
                  Membres ({team.length})
                </h3>
                {myRole === 'owner' && !showInviteForm && (
                  <button
                    onClick={() => { setShowInviteForm(true); setInviteMsg(null) }}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors text-white hover:opacity-80"
                    style={{ background: '#00AEEF' }}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Inviter
                  </button>
                )}
              </div>

              {/* Formulaire invitation */}
              {showInviteForm && myRole === 'owner' && (
                <form onSubmit={handleInvite} className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,174,239,0.05)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00AEEF' }}>Inviter un membre</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="email" required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="email@entreprise.com"
                      className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as 'owner' | 'member')}
                      className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                    >
                      <option value="member" style={{ background: '#09111f' }}>Utilisateur</option>
                      <option value="owner" style={{ background: '#09111f' }}>Administrateur</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={inviting}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity hover:opacity-80"
                      style={{ background: '#00AEEF' }}>
                      <Mail className="w-3.5 h-3.5" />
                      {inviting ? 'Envoi…' : 'Envoyer l\'invitation'}
                    </button>
                    <button type="button" onClick={() => setShowInviteForm(false)}
                      className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg transition-colors">
                      Annuler
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Si la personne n'a pas encore de compte, elle recevra un email pour s'inscrire et rejoindre automatiquement votre équipe.
                  </p>
                </form>
              )}

              {teamLoading ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Chargement…</div>
              ) : team.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Aucun membre pour l'instant.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {team.map((m: any) => {
                    const p = m.profile
                    const isSelf = p?.id === user.id
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: m.role === 'owner' ? 'rgba(245,196,0,0.15)' : 'rgba(0,174,239,0.15)', color: m.role === 'owner' ? '#F5C400' : '#00AEEF' }}>
                          {(p?.full_name || p?.email || '?')[0].toUpperCase()}
                        </div>
                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white truncate">{p?.full_name || p?.email}</p>
                            {isSelf && <span className="text-[9px] font-bold bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">Vous</span>}
                          </div>
                          {p?.full_name && <p className="text-xs text-slate-400 truncate">{p?.email}</p>}
                        </div>
                        {/* Rôle */}
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                          m.role === 'owner'
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : 'bg-white/8 text-slate-400'
                        }`}>
                          {m.role === 'owner' ? <Crown className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                          {m.role === 'owner' ? 'Admin' : 'Utilisateur'}
                        </span>
                        {/* Actions (owner only) */}
                        {myRole === 'owner' && !isSelf && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleChangeRole(m.id, m.role === 'owner' ? 'member' : 'owner')}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                              title={m.role === 'owner' ? 'Rétrograder en utilisateur' : 'Promouvoir administrateur'}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                              title="Retirer du compte"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Invitations en attente */}
            {teamPending.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Invitations en attente ({teamPending.length})
                  </h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {teamPending.map((inv: any) => (
                    <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                      <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{inv.email}</p>
                        <p className="text-[10px] text-slate-500">
                          {inv.role === 'owner' ? 'Administrateur' : 'Utilisateur'} · Invité le {new Date(inv.created_at).toLocaleDateString('fr-BE')}
                        </p>
                      </div>
                      {myRole === 'owner' && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Annuler l'invitation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explication des rôles */}
            <div className="rounded-xl p-4 text-xs text-slate-400 space-y-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-bold text-slate-300 mb-2">Rôles</p>
              <p><span className="font-bold text-yellow-400">Administrateur</span> — Accès complet : passer des commandes, consulter l'historique, inviter/retirer des membres.</p>
              <p><span className="font-bold text-slate-300">Utilisateur</span> — Passer des commandes et consulter l'historique du compte.</p>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
