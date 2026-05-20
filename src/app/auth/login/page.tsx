'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else { router.push('/compte'); router.refresh() }
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else setSent(true)
    }
    setLoading(false)
  }

  if (sent) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-sm w-full">
        <p className="text-4xl mb-4">📧</p>
        <h2 className="font-extrabold text-slate-900 text-xl mb-2">Vérifiez votre email</h2>
        <p className="text-slate-500 text-sm">Un lien de confirmation a été envoyé à <strong>{email}</strong>.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full">
        <Link href="/" className="block mb-6">
          <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
            alt="Comink" className="h-10 w-auto" />
        </Link>
        <div className="flex mb-6 border-b border-slate-200">
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {tab === 'signup' && (
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Votre nom"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
