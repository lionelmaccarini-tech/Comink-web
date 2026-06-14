'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, ChevronDown, Paperclip, ShoppingCart, FileSpreadsheet, LogIn, UserRound, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CommandeRapideAction {
  items: unknown[]
  summary: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  commandeRapide?: CommandeRapideAction
  loginRequired?: boolean
}

interface VisitorInfo {
  name: string
  email: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2)
}

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  text: "Bonjour ! Je suis **Angelo**, l'assistant Comink 👋\nJe peux vous aider à trouver le bon produit d'impression, vous donner des infos sur nos délais et tarifs, ou vous mettre en contact avec notre équipe. Comment puis-je vous aider ?",
}

// Minimal markdown: bold, line breaks
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part === '\n') return <br key={i} />
    return part
  })
}

// ── Visitor form ──────────────────────────────────────────────────────────────
function VisitorForm({ onSubmit }: { onSubmit: (info: VisitorInfo) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600">
        Pour personnaliser votre expérience et pouvoir vous recontacter si besoin, pouvez-vous nous donner vos coordonnées ?
      </p>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        placeholder="Votre prénom et nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ name, email })}
          disabled={!name.trim() || !email.trim()}
          className="flex-1 bg-sky-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-sky-700 transition-colors"
        >
          Démarrer
        </button>
        <button
          onClick={() => onSubmit({ name: '', email: '' })}
          className="text-gray-400 text-sm px-2 hover:text-gray-600"
        >
          Passer
        </button>
      </div>
    </div>
  )
}

// ── Handoff panel ─────────────────────────────────────────────────────────────
function HandoffPanel({
  visitorInfo,
  messages,
  onSuccess,
  onCancel,
}: {
  visitorInfo: VisitorInfo
  messages: Message[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [phone, setPhone] = useState('')
  const [note, setNote]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/chat/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName:  visitorInfo.name,
          visitorEmail: visitorInfo.email,
          visitorPhone: phone.trim() || undefined,
          extraNote:    note.trim() || undefined,
          messages: messages
            .filter(m => m.id !== 'greeting')
            .map(m => ({ role: m.role, text: m.text })),
        }),
      })
      if (!res.ok) throw new Error('Erreur réseau')
      onSuccess()
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez-nous par email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col px-4 py-5 rounded-b-2xl" style={{ top: 0 }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <UserRound className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Parler à un conseiller</p>
          <p className="text-xs text-gray-500">Notre équipe vous recontactera au plus vite</p>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {/* Nom + email pré-remplis (lecture seule) */}
        {(visitorInfo.name || visitorInfo.email) && (
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 space-y-0.5">
            {visitorInfo.name  && <p>👤 {visitorInfo.name}</p>}
            {visitorInfo.email && <p>✉️ {visitorInfo.email}</p>}
          </div>
        )}

        {/* Téléphone */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Téléphone <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+32 4xx xx xx xx"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Note complémentaire */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Précisez votre demande <span className="text-gray-400">(optionnel)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex : j'ai besoin d'un devis urgent pour vendredi…"
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Envoyer
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AngeloChat() {
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({ name: '', email: '' })
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = not yet checked
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [showHandoff, setShowHandoff] = useState(false)
  const [handoffDone, setHandoffDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check Supabase auth on mount + listen to changes
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
        const email = session.user.email || ''
        setVisitorInfo({ name, email })
        setUserId(session.user.id)
        setShowForm(false) // Déjà connecté → pas besoin du formulaire
        setMessages([{
          id: 'greeting',
          role: 'assistant',
          text: `Bonjour ${name} ! Je suis **Angelo**, l'assistant Comink 👋\nComment puis-je vous aider ? Vous pouvez consulter vos **devis et commandes**, **importer un fichier Excel/CSV** 📎 pour créer une commande rapide, ou simplement me poser vos questions.`,
        }])
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
        setVisitorInfo({ name, email: session.user.email || '' })
        setUserId(session.user.id)
        setShowForm(false)
      } else {
        setUserId(undefined)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open && !showForm) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, showForm])

  const handleOpen = () => {
    setOpen(true)
    setHasNew(false)
  }

  const handleVisitorSubmit = (info: VisitorInfo) => {
    setVisitorInfo(info)
    setShowForm(false)
    if (info.name) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: `Bonjour ${info.name} ! Ravis de vous accueillir chez Comink. Comment puis-je vous aider aujourd'hui ?`,
        },
      ])
    }
  }

  // ── File upload handler ────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || loading || uploading) return

    // Vérifier si l'utilisateur est connecté
    if (!isLoggedIn) {
      const loginMsg: Message = {
        id: uid(),
        role: 'assistant',
        text: '🔒 Pour créer une commande depuis un fichier, vous devez être connecté à votre compte Comink.',
        loginRequired: true,
      }
      setMessages((prev) => [...prev, loginMsg])
      return
    }

    setUploading(true)

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      text: `📎 ${file.name}`,
    }
    setMessages((prev) => [...prev, userMsg])

    const assistantId = uid()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }])

    try {
      // 1. Parse the file (Excel/CSV → CSV text)
      const form = new FormData()
      form.append('file', file)
      const parseRes = await fetch('/api/orders/parse-order-file', { method: 'POST', body: form })
      const parsed = await parseRes.json()

      if (!parseRes.ok) {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, text: `❌ ${parsed.error || 'Impossible de lire le fichier.'}` } : m,
        ))
        return
      }

      // 2. Send CSV content to Angelo for analysis
      const prompt = `J'ai importé le fichier **${parsed.file_name}** (${parsed.rows} lignes, colonnes : ${parsed.columns.join(', ')}).\n\nVoici le contenu :\n\`\`\`\n${parsed.csv}\n\`\`\`\n\nAnalyse ce fichier de commande et transforme-le en commande rapide Comink.`

      const history = [...messages, userMsg, { id: assistantId, role: 'assistant' as const, text: '' }]
        .filter((m) => m.id !== 'greeting' && m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.text }))
      history.push({ role: 'user', content: prompt })

      setLoading(true)

      const res = await fetch('/api/chat/angelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          visitorInfo: visitorInfo.name ? visitorInfo : undefined,
          use_sonnet: true,  // Toujours utiliser Sonnet pour le parsing de fichier
          user_id: userId,
          user_email: visitorInfo.email || undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Erreur réseau')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const evt = JSON.parse(raw)
            if (evt.type === 'text') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + evt.text } : m,
              ))
            } else if (evt.type === 'commande_rapide') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, commandeRapide: { items: evt.items, summary: evt.summary } } : m,
              ))
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId
          ? { ...m, text: "Désolé, une erreur est survenue lors de l'analyse du fichier." }
          : m,
      ))
    } finally {
      setLoading(false)
      setUploading(false)
      if (!open) setHasNew(true)
    }
  }, [loading, uploading, messages, visitorInfo, open, isLoggedIn, userId])

  // ── Open commande rapide with pre-loaded items ─────────────────────────────
  const openCommandeRapide = useCallback((items: unknown[]) => {
    // Stocker sous une clé dédiée lue par CommandeRapideClient au montage
    localStorage.setItem('comink_angelo_preload', JSON.stringify(items))
    window.location.href = '/commande-rapide'
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: uid(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build messages array for API (exclude greeting which has no real context)
    const history = [...messages, userMsg]
      .filter((m) => m.id !== 'greeting')
      .map((m) => ({ role: m.role, content: m.text }))

    const assistantId = uid()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', text: '' },
    ])

    try {
      // Use Sonnet when user is connected (more complex queries: quotes, orders)
      const needsSonnet = isLoggedIn === true
      const res = await fetch('/api/chat/angelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          visitorInfo: visitorInfo.name ? visitorInfo : undefined,
          use_sonnet: needsSonnet,
          user_id: userId,
          user_email: visitorInfo.email || undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Erreur réseau')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const evt = JSON.parse(raw)
            if (evt.type === 'text') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: m.text + evt.text } : m,
                ),
              )
            } else if (evt.type === 'commande_rapide') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, commandeRapide: { items: evt.items, summary: evt.summary } } : m,
              ))
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: "Désolé, je n'arrive pas à vous répondre en ce moment. Réessayez ou contactez-nous par email." }
            : m,
        ),
      )
    } finally {
      setLoading(false)
      if (!open) setHasNew(true)
    }
  }, [input, loading, messages, visitorInfo, open, isLoggedIn, userId])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        data-angelo-trigger
        aria-label="Ouvrir le chat"
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          bg-sky-600 hover:bg-sky-700 text-white transition-all
          flex items-center justify-center
          ${open ? 'scale-0 pointer-events-none' : 'scale-100'}
        `}
      >
        <MessageCircle className="w-6 h-6" />
        {hasNew && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat window */}
      <div
        className={`
          fixed bottom-6 right-6 z-50 w-80 sm:w-96
          bg-white rounded-2xl shadow-2xl border border-gray-200
          flex flex-col transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}
        `}
        style={{ height: '520px' }}
      >
        {/* Header */}
        <div className="bg-sky-600 rounded-t-2xl px-4 py-3 flex items-center gap-3 text-white flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            R
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Angelo Comink</p>
            <p className="text-xs text-sky-100">Assistant Comink · En ligne</p>
          </div>
          {/* Bouton Parler à un humain — visible dès qu'il y a ≥1 échange hors greeting */}
          {!showForm && !handoffDone && messages.filter(m => m.id !== 'greeting').length >= 1 && (
            <button
              onClick={() => setShowHandoff(true)}
              title="Transmettre à un conseiller humain"
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors flex-shrink-0"
            >
              <UserRound className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Parler à un humain</span>
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-white/80 hover:text-white p-1"
            aria-label="Fermer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Visitor form OR messages */}
        {showForm ? (
          <VisitorForm onSubmit={handleVisitorSubmit} />
        ) : (
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Handoff panel (overlay) */}
            {showHandoff && (
              <HandoffPanel
                visitorInfo={visitorInfo}
                messages={messages}
                onCancel={() => setShowHandoff(false)}
                onSuccess={() => {
                  setShowHandoff(false)
                  setHandoffDone(true)
                  setMessages(prev => [...prev, {
                    id: uid(),
                    role: 'assistant',
                    text: '✅ Votre conversation a bien été transmise à notre équipe.\n\nUn conseiller Comink vous recontactera dans les meilleurs délais. À bientôt !',
                  }])
                }}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                      R
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`
                        rounded-2xl px-3 py-2 text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-sky-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }
                        ${!msg.text && msg.role === 'assistant' ? 'inline-block' : ''}
                      `}
                    >
                      {msg.text ? renderText(msg.text) : (
                        <span className="flex gap-1 items-center py-0.5">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>

                    {/* Login required card */}
                    {msg.loginRequired && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-amber-700 font-medium">Connexion requise pour importer une commande</p>
                        <a
                          href={`/auth/login?redirect=/commande-rapide`}
                          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Se connecter / Créer un compte
                        </a>
                      </div>
                    )}

                    {/* Commande Rapide action card */}
                    {msg.commandeRapide && (
                      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sky-700">
                          <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-semibold">{msg.commandeRapide.items.length} article{msg.commandeRapide.items.length > 1 ? 's' : ''} prêt{msg.commandeRapide.items.length > 1 ? 's' : ''}</span>
                        </div>
                        {msg.commandeRapide.summary && (
                          <p className="text-xs text-sky-600">{msg.commandeRapide.summary}</p>
                        )}
                        <button
                          onClick={() => openCommandeRapide(msg.commandeRapide!.items)}
                          className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Ouvrir dans Commande Rapide
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t px-3 py-2 flex gap-2 flex-shrink-0">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploading}
                aria-label="Joindre un fichier Excel/CSV"
                title={
                  isLoggedIn === false
                    ? 'Connectez-vous pour importer une commande'
                    : 'Importer un fichier de commande Excel/CSV'
                }
                className={`w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0 ${
                  isLoggedIn === false
                    ? 'border-amber-200 bg-amber-50 text-amber-400 hover:bg-amber-100 hover:text-amber-600'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-sky-600'
                }`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Écrivez votre message…"
                disabled={loading || uploading}
                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || uploading}
                aria-label="Envoyer"
                className="w-9 h-9 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
