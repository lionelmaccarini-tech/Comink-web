'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Error boundary]', error.message, error.stack) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#09111f' }}>
      {/* Barre CMYK */}
      <div className="fixed top-0 left-0 right-0 flex" style={{ height: '3px' }}>
        <div className="flex-1" style={{ background: '#00AEEF' }} />
        <div className="flex-1" style={{ background: '#E8001A' }} />
        <div className="flex-1" style={{ background: '#F5C400' }} />
      </div>

      <div className="rounded-2xl p-10 max-w-md w-full text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-black mb-2" style={{ fontSize: '7rem', lineHeight: 1, color: '#E8001A' }}>500</p>
        <h1 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-slate-400 text-sm mb-6">
          Quelque chose s'est mal passé. Réessayez ou revenez à l'accueil.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs rounded-lg p-3 mb-6 overflow-auto text-red-400 max-h-40"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error.message}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="font-bold text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: '#00AEEF', color: 'white' }}>
            Réessayer
          </button>
          <Link href="/"
            className="font-bold text-sm px-6 py-3 rounded-xl transition-colors hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
