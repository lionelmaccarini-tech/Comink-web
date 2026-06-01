'use client'

import React, { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Chargement client-only, jamais SSR
const FileCheckerClient = dynamic(
  () => import('./FileCheckerClient'),
  { ssr: false }
)

// Error boundary local — intercepte les crashes du composant
interface EBState { crashed: boolean; error?: string }
class FileCheckerBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { crashed: false }
  }
  static getDerivedStateFromError(e: Error) {
    return { crashed: true, error: e?.message }
  }
  componentDidCatch(e: Error) {
    console.error('[FileChecker] crash:', e?.message)
  }
  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-3xl mb-4">⚠️</p>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Outil temporairement indisponible</h2>
            <p className="text-slate-500 text-sm mb-6">
              L'outil de vérification rencontre un problème technique.
              Envoyez votre fichier directement par email et notre équipe le contrôlera.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-300 font-mono mb-4 truncate">{this.state.error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/devis"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Demander un devis →
              </Link>
              <button onClick={() => this.setState({ crashed: false, error: undefined })}
                className="border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function FileCheckerWrapper() {
  return (
    <FileCheckerBoundary>
      <FileCheckerClient />
    </FileCheckerBoundary>
  )
}
