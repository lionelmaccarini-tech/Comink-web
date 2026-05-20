import React from 'react'
import Link from 'next/link'
import { ShoppingCart, FileText, Shield, Zap } from 'lucide-react'

export default function CtaFinalSection() {
  return (
    <section className="bg-slate-900 py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">PASSEZ À L'ACTION</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
          Prêt à lancer votre projet ?
        </h2>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
          Commandez directement en ligne ou demandez un devis personnalisé — on répond vite.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <Link
            href="/commande"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20"
          >
            <ShoppingCart className="w-4 h-4" /> Commander maintenant
          </Link>
          <Link
            href="/devis"
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3.5 rounded-lg flex items-center gap-2 transition-colors text-sm border border-slate-600"
          >
            <FileText className="w-4 h-4" /> Demander un devis
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-600" /> Paiement sécurisé</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-slate-600" /> Devis sous 2h</span>
          <span>Production locale à Liège</span>
        </div>
      </div>
    </section>
  )
}
