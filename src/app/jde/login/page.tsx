'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function JDELoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/jde')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#E8271A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-[#F5C200] rounded-2xl px-6 py-3 mb-4">
            <span className="text-slate-900 font-extrabold text-2xl tracking-tight">PRINT MY JDE</span>
          </div>
          <p className="text-red-100 text-sm">Journée Découverte Entreprise</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-extrabold text-slate-900 mb-6 text-center">Connexion</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mot de passe</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]"
              />
            </div>
            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8271A] hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">
            Accès réservé aux participants JDE.
            <br />
            Contactez votre coordinateur pour obtenir vos identifiants.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-red-200 text-xs mt-6">
          Powered by{' '}
          <a href="https://comink.be" className="text-white hover:underline" target="_blank" rel="noopener noreferrer">
            Comink
          </a>
        </p>
      </div>
    </div>
  )
}
