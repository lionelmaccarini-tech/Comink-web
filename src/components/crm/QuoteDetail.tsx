'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Edit3, CheckCircle, XCircle, Clock, MessageSquare, Phone, Mail, Notebook, Activity, Package, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ConvertToOrderModal from './ConvertToOrderModal'

const fmt    = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

const STAGE_STYLE: Record<string, string> = {
  lead:        'bg-slate-100 text-slate-700',
  contacted:   'bg-blue-100 text-blue-700',
  quoted:      'bg-violet-100 text-violet-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won:         'bg-emerald-100 text-emerald-700',
  lost:        'bg-red-100 text-red-700',
}
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', contacted: 'Contacté', quoted: 'Devis envoyé',
  negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu',
}
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note:          <Notebook className="w-3.5 h-3.5" />,
  call:          <Phone className="w-3.5 h-3.5" />,
  email:         <Mail className="w-3.5 h-3.5" />,
  meeting:       <MessageSquare className="w-3.5 h-3.5" />,
  status_change: <Activity className="w-3.5 h-3.5" />,
}

export default function QuoteDetail({ quoteId, showSentBanner }: { quoteId: string; showSentBanner?: boolean }) {
  const [quote,      setQuote]      = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [sending,    setSending]    = useState(false)
  const [sendingToClient, setSendingToClient] = useState(false)
  const [sentToClientMsg, setSentToClientMsg] = useState<string | null>(null)
  const [newNote,    setNewNote]    = useState('')
  const [noteType,   setNoteType]   = useState<'note' | 'call' | 'meeting'>('note')
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertedOrderNumber, setConvertedOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setCurrentUser(user ? { id: user.id } : null))
    reload()
  }, [quoteId])

  const reload = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/crm/quotes/${quoteId}`).then(r => r.json()),
      fetch(`/api/crm/activities?quote_id=${quoteId}`).then(r => r.json()),
    ]).then(([q, a]) => {
      setQuote(q)
      setActivities(Array.isArray(a) ? a : [])
    }).finally(() => setLoading(false))
  }

  const send = async () => {
    setSending(true)
    const res = await fetch(`/api/crm/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sent_by: currentUser?.id }),
    })
    if (res.ok) reload()
    setSending(false)
  }

  const markStage = async (stage: string) => {
    await fetch(`/api/crm/quotes/${quoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: stage, _updated_by: currentUser?.id }),
    })
    reload()
  }

  const sendToClient = async () => {
    setSendingToClient(true)
    setSentToClientMsg(null)
    try {
      const res = await fetch(`/api/crm/quotes/${quoteId}/send-to-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent_by: currentUser?.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setSentToClientMsg(`Email envoyé à ${quote?.client_email}`)
        reload()
      } else {
        setSentToClientMsg(data.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      setSentToClientMsg('Erreur lors de l\'envoi')
    } finally {
      setSendingToClient(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    await fetch('/api/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_id: quoteId, type: noteType, content: newNote, created_by: currentUser?.id }),
    })
    setNewNote('')
    reload()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!quote || quote.error) return (
    <div className="text-center text-slate-400 py-20">Devis introuvable</div>
  )

  const lines: any[] = Array.isArray(quote.items) ? quote.items : []

  return (
    <div>
      {showConvertModal && quote && (
        <ConvertToOrderModal
          quote={quote}
          currentUserId={currentUser?.id}
          onClose={() => setShowConvertModal(false)}
          onConverted={(orderNumber) => {
            setConvertedOrderNumber(orderNumber)
            setShowConvertModal(false)
            reload()
          }}
        />
      )}

      {showSentBanner && (
        <div className="mb-5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> Devis envoyé avec succès à {quote.client_email}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Main — 2 cols */}
        <div className="lg:col-span-2 space-y-5">

          {/* Quote header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-slate-900">{quote.quote_number}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STAGE_STYLE[quote.pipeline_stage]}`}>
                    {STAGE_LABEL[quote.pipeline_stage]}
                  </span>
                </div>
                <p className="text-slate-500 text-sm">{fmtDate(quote.created_at)}</p>
                {quote.reference && <p className="text-slate-400 text-xs mt-0.5">Réf. client : {quote.reference}</p>}
              </div>
              <div className="flex gap-2">
                <Link href={`/crm/quotes/${quoteId}/edit`}
                  className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
                  <Edit3 className="w-4 h-4" /> Modifier
                </Link>
                <button onClick={send} disabled={sending}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  <Send className="w-4 h-4" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>

            {/* Client info */}
            <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Client</p>
                <p className="font-semibold text-slate-800">{quote.client_name}</p>
                {quote.client_company && <p className="text-sm text-slate-500">{quote.client_company}</p>}
                {quote.vat_number && <p className="text-xs text-slate-400">TVA : {quote.vat_number}</p>}
              </div>
              <div className="space-y-1">
                {quote.client_email && (
                  <a href={`mailto:${quote.client_email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Mail className="w-3.5 h-3.5" /> {quote.client_email}
                  </a>
                )}
                {quote.client_phone && (
                  <a href={`tel:${quote.client_phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                    <Phone className="w-3.5 h-3.5" /> {quote.client_phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-16">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-24">P.U. HT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-20">TVA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-28">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line: any, i: number) => (
                  <tr key={line.id || i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{line.description}</p>
                      {line.details && <p className="text-xs text-slate-400 mt-0.5">{line.details}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{line.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(line.unit_price_ht ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{line.vat_rate ?? 21}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt((line.quantity ?? 1) * (line.unit_price_ht ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-slate-500">Sous-total HT</td>
                  <td className="px-4 py-2 text-right text-sm font-medium">{fmt(quote.subtotal ?? 0)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-slate-500">TVA</td>
                  <td className="px-4 py-2 text-right text-sm">{fmt(quote.tax ?? 0)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-800">Total TTC</td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">{fmt(quote.total ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Remarques</p>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Activity feed */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Activités</h3>

            {/* Add note */}
            <div className="mb-4 bg-slate-50 rounded-lg p-3">
              <div className="flex gap-2 mb-2">
                {(['note', 'call', 'meeting'] as const).map(t => (
                  <button key={t} onClick={() => setNoteType(t)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${noteType === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                    {ACTIVITY_ICONS[t]}
                    {t === 'note' ? 'Note' : t === 'call' ? 'Appel' : 'Réunion'}
                  </button>
                ))}
              </div>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter une note, appel, réunion..." />
              <button onClick={addNote} disabled={!newNote.trim()}
                className="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
                Ajouter
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {activities.map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs
                    ${a.type === 'email' ? 'bg-violet-500' : a.type === 'call' ? 'bg-blue-500' : a.type === 'meeting' ? 'bg-amber-500' : a.type === 'status_change' ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                    {ACTIVITY_ICONS[a.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-700">{a.content}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(a.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {a.author && <p className="text-xs text-slate-400">{a.author.full_name}</p>}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Aucune activité enregistrée</p>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Actions rapides</h3>
            <div className="space-y-2">

              {/* Bon de commande */}
              {quote.pipeline_stage !== 'won' && (
                <button onClick={() => setShowConvertModal(true)}
                  className="w-full flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg transition-colors">
                  <Package className="w-4 h-4" /> Créer un bon de commande
                </button>
              )}
              {convertedOrderNumber && (
                <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Bon de commande <strong>{convertedOrderNumber}</strong> créé
                </div>
              )}

              {/* Envoyer au client avec lien de validation */}
              {quote.pipeline_stage !== 'won' && (
                <button onClick={sendToClient} disabled={sendingToClient}
                  className="w-full flex items-center gap-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                  <ExternalLink className="w-4 h-4" />
                  {sendingToClient ? 'Envoi...' : 'Envoyer au client'}
                </button>
              )}
              {sentToClientMsg && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${sentToClientMsg.startsWith('Email') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {sentToClientMsg.startsWith('Email') && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  {sentToClientMsg}
                </div>
              )}

              {quote.pipeline_stage !== 'won' && (
                <button onClick={() => markStage('won')}
                  className="w-full flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2.5 rounded-lg transition-colors">
                  <CheckCircle className="w-4 h-4" /> Marquer comme Gagné
                </button>
              )}
              {quote.pipeline_stage !== 'lost' && (
                <button onClick={() => markStage('lost')}
                  className="w-full flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2.5 rounded-lg transition-colors">
                  <XCircle className="w-4 h-4" /> Marquer comme Perdu
                </button>
              )}
            </div>
          </div>

          {/* CRM info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-700">Infos CRM</h3>
            <Row label="Source"       value={quote.source} />
            <Row label="Probabilité"  value={`${quote.probability ?? 0}%`} />
            <Row label="Valeur attendue" value={fmt(quote.expected_amount || quote.total || 0)} />
            {quote.assignee && <Row label="Assigné à" value={quote.assignee.full_name} />}
            {quote.valid_until && <Row label="Valide jusqu'au" value={fmtDate(quote.valid_until)} />}
            {quote.next_action_date && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Prochaine action</p>
                <p className={`text-sm font-medium ${new Date(quote.next_action_date) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {fmtDate(quote.next_action_date)}
                </p>
                {quote.next_action_note && <p className="text-xs text-slate-500 mt-0.5">{quote.next_action_note}</p>}
              </div>
            )}
            {quote.lost_reason && <Row label="Raison perdu" value={quote.lost_reason} />}
          </div>

        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
