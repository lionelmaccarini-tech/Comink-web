'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Error boundary]', error.message, error.stack) }, [error])
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Une erreur est survenue</h1>
        <p className="text-slate-500 text-sm mb-6">
          Quelque chose s'est mal passé. Réessayez ou revenez à l'accueil.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs bg-red-50 border border-red-200 rounded-lg p-3 mb-6 overflow-auto text-red-700 max-h-40">
            {error.message}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
            Réessayer
          </button>
          <Link href="/"
            className="border-2 border-slate-200 hover:border-blue-400 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
