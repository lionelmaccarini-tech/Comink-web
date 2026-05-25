'use client'

import React from 'react'
import { useJDE } from '@/components/jde/JDEContext'
import LogoUpload from '@/components/jde/LogoUpload'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JDEComptePage() {
  const { jdeClient, refreshClient } = useJDE()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/jde/login')
    router.refresh()
  }

  if (!jdeClient) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">Connectez-vous pour accéder à votre compte.</p>
        <Link href="/jde/login" className="bg-[#E8271A] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">
          Se connecter
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-8">Mon compte</h1>

      {/* Profile info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-4">Informations</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Nom</p>
            <p className="text-sm font-semibold text-slate-800">{jdeClient.full_name}</p>
          </div>
          {jdeClient.company && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Entreprise</p>
              <p className="text-sm font-semibold text-slate-800">{jdeClient.company}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Email</p>
            <p className="text-sm font-semibold text-slate-800">{jdeClient.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Solde de points</p>
            <p className="text-2xl font-extrabold text-[#F5C200]">{jdeClient.points_balance} pts</p>
          </div>
        </div>
      </div>

      {/* Logo upload */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-2">Mon logo</h2>
        <p className="text-xs text-slate-400 mb-4">
          Téléchargez votre logo pour personnaliser vos produits JDE. PNG ou SVG recommandé, fond transparent.
        </p>
        <LogoUpload
          currentLogoUrl={jdeClient.logo_url ?? undefined}
          currentLogoName={jdeClient.logo_name ?? undefined}
          onUploadSuccess={refreshClient}
        />
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <button
          onClick={handleLogout}
          className="w-full border border-red-200 text-[#E8271A] font-bold py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
