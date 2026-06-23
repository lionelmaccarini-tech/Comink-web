'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle } from 'lucide-react'

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 placeholder:text-slate-500"
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }

function CmykBar() {
  return (
    <div className="fixed top-0 left-0 right-0 flex h-[3px] z-50">
      <div className="flex-1" style={{ background: '#00AEEF' }} />
      <div className="flex-1" style={{ background: '#E8001A' }} />
      <div className="flex-1" style={{ background: '#F5C400' }} />
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [phase, setPhase] = useState<'request' | 'update' | 'done'>('request')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)

  // Si l'utilisateur arrive ici après avoir cliqué le lien de l'email,
  // il a une session "recovery" active → on passe directement à l'étape "update"
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setPhase('update')
    })

    // Écouter PASSWORD_RECOVERY (reset mdp) et SIGNED_IN (invitation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session?.user)) {
        setPhase('update')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Étape 1 : demande d'email ─────────────────────────────────────────────
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  // ── Étape 2 : nouveau mot de passe ───────────────────────────────────────
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)  { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setPhase('done')
  }

  const cardStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,174,239,0.2)' }

  // ── Confirmation envoi email ──────────────────────────────────────────────
  if (sent) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      <CmykBar />
      <div className="rounded-2xl p-10 text-center max-w-sm w-full" style={{ ...cardStyle }}>
        <p className="text-4xl mb-4">📧</p>
        <h2 className="font-extrabold text-white text-xl mb-2">Email envoyé</h2>
        <p className="text-slate-400 text-sm mb-6">
          Un lien de réinitialisation a été envoyé à <strong className="text-white">{email}</strong>.
          Vérifiez vos spams si vous ne le recevez pas.
        </p>
        <Link href="/auth/login" className="text-xs font-bold" style={{ color: '#00AEEF' }}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )

  // ── Mot de passe mis à jour ───────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      <CmykBar />
      <div className="rounded-2xl p-10 text-center max-w-sm w-full" style={{ ...cardStyle }}>
        <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#00AEEF' }} />
        <h2 className="font-extrabold text-white text-xl mb-2">Mot de passe mis à jour</h2>
        <p className="text-slate-400 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <button
          onClick={() => router.push('/compte')}
          className="w-full text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          style={{ background: '#00AEEF' }}
        >
          Accéder à mon compte
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      <CmykBar />

      <div className="rounded-2xl p-8 max-w-sm w-full" style={{ ...cardStyle }}>
        <Link href="/" className="block mb-6">
          <img
            src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
            alt="Comink" className="h-10 w-auto brightness-0 invert"
          />
        </Link>

        {phase === 'request' ? (
          <>
            <h1 className="font-extrabold text-white text-lg mb-1">Mot de passe oublié</h1>
            <p className="text-slate-400 text-sm mb-6">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <form onSubmit={handleRequest} className="space-y-4">
              <input
                required type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Votre adresse email"
                className={inputCls} style={inputStyle}
              />
              {error && (
                <p className="text-red-400 text-xs rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading}
                className="w-full disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 text-sm"
                style={{ background: '#00AEEF' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le lien'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#00AEEF' }}>
                ← Retour à la connexion
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-extrabold text-white text-lg mb-1">Nouveau mot de passe</h1>
            <p className="text-slate-400 text-sm mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                required type="password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (min. 8 caractères)"
                className={inputCls} style={inputStyle}
              />
              <input
                required type="password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className={inputCls} style={inputStyle}
              />
              {error && (
                <p className="text-red-400 text-xs rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading}
                className="w-full disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 text-sm"
                style={{ background: '#00AEEF' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
