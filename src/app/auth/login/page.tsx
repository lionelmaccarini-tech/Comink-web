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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      {/* Barre CMYK top */}
      <div className="fixed top-0 left-0 right-0 flex h-[3px] z-50">
        <div className="flex-1" style={{ background: '#00AEEF' }} />
        <div className="flex-1" style={{ background: '#E8001A' }} />
        <div className="flex-1" style={{ background: '#F5C400' }} />
      </div>
      <div className="rounded-2xl p-10 text-center max-w-sm w-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,174,239,0.25)' }}>
        <p className="text-4xl mb-4">📧</p>
        <h2 className="font-extrabold text-white text-xl mb-2">Vérifiez votre email</h2>
        <p className="text-slate-400 text-sm">Un lien de confirmation a été envoyé à <strong className="text-white">{email}</strong>.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      {/* Barre CMYK top */}
      <div className="fixed top-0 left-0 right-0 flex h-[3px] z-50">
        <div className="flex-1" style={{ background: '#00AEEF' }} />
        <div className="flex-1" style={{ background: '#E8001A' }} />
        <div className="flex-1" style={{ background: '#F5C400' }} />
      </div>

      <div className="rounded-2xl p-8 max-w-sm w-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,174,239,0.2)' }}>
        <Link href="/" className="block mb-6">
          <img src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
            alt="Comink" className="h-10 w-auto brightness-0 invert" />
        </Link>

        <div className="flex mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === t ? 'border-[#00AEEF] text-[#00AEEF]' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              {t === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {tab === 'signup' && (
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Votre nom"
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          )}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          {error && (
            <p className="text-red-400 text-xs rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 text-sm"
            style={{ background: '#00AEEF' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        {tab === 'login' && (
          <div className="mt-4 text-center">
            <Link href="/auth/reset-password" className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#00AEEF' }}>
              Mot de passe oublié ?
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
