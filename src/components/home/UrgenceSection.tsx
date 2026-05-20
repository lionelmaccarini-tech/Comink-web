import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function UrgenceSection() {
  return (
    <section
      className="py-14 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">UN PROJET URGENT ?</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            On gère. On trouve la solution.
          </h2>
          <p className="text-slate-300 text-sm mt-2 max-w-md">
            Délais courts, imprévus, changements de dernière minute… Appelez-nous ou écrivez — on ne vous laisse jamais tomber.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-blue-200">
            <span className="flex items-center gap-1.5">⚡ Devis en moins de 2h</span>
            <span className="flex items-center gap-1.5">📞 +32 4 233 01 38</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <Link
            href="/contact"
            className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-7 py-3.5 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-lg"
          >
            Parler à un expert <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/devis"
            className="bg-transparent border-2 border-white/50 hover:border-white text-white font-bold px-7 py-3.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            Demander un devis
          </Link>
        </div>
      </div>
    </section>
  )
}
