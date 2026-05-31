import React from 'react'
import Link from 'next/link'
import { Phone, ArrowRight, Clock } from 'lucide-react'

export default function UrgenceSection() {
  return (
    <section className="bg-slate-900 py-14 border-y border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Left */}
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">UN PROJET URGENT ?</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-2">
                On gère. On trouve la solution.
              </h2>
              <p className="text-slate-400 text-sm max-w-md">
                Délais courts, imprévus, changements de dernière minute — appelez-nous directement.
                On ne vous laisse jamais tomber.
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
            <a
              href="tel:+3242330138"
              className="flex items-center gap-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-orange-500/20"
            >
              <Phone className="w-4 h-4" /> +32 4 233 01 38
            </a>
            <Link
              href="/devis"
              className="flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-200 hover:text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm"
            >
              Devis express <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
