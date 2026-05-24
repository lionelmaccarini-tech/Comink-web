'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
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

// ── Main component ────────────────────────────────────────────────────────────
export default function AngeloChat() {
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({ name: '', email: '' })
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      const res = await fetch('/api/chat/angelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          visitorInfo: visitorInfo.name ? visitorInfo : undefined,
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
            }
            // tool_call & done events are silent — no UI needed
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
  }, [input, loading, messages, visitorInfo, open])

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
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
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
                  <div
                    className={`
                      max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-sky-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }
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
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t px-3 py-2 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Écrivez votre message…"
                disabled={loading}
                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
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
          </>
        )}
      </div>
    </>
  )
}
