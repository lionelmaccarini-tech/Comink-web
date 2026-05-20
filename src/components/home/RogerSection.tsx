'use client'

import React from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'

export default function RogerSection() {
  return (
    <section className="bg-slate-900 py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-10">
          {/* Avatar Roger */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-28 h-28 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl">
              <img
                src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
                alt="Roger Comink"
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-400">Roger Comink</span>
            </div>
          </div>

          {/* Texte */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
              Une question ?<br />
              <span className="text-blue-400">Réponse immédiate.</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              Discutez avec Roger Comink, notre assistant IA disponible 24/7, ou parlez directement à un humain.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const btn = document.querySelector<HTMLButtonElement>('[data-roger-trigger]')
                  if (btn) btn.click()
                }}
                className="bg-blue-600 text-white px-5 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Lancer le chat
              </button>
              <Link
                href="/contact"
                className="flex items-center gap-2 border border-slate-500 hover:border-white text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                <Phone className="w-4 h-4" /> Parler à un humain
              </Link>
            </div>
          </div>

          {/* Aperçu chat */}
          <div className="hidden lg:block w-72 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-700 border-b border-slate-600">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-bold">Roger Comink</span>
              <span className="text-slate-400 text-xs ml-auto">En ligne</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-700 rounded-xl rounded-tl-none px-3 py-2 text-xs text-slate-200 max-w-[90%]">
                Salut ! Je suis Roger Comink. Comment puis-je vous aider pour votre projet d'impression ?
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Quels sont les délais ?', 'Quel produit choisir ?', 'Demander un devis'].map((q) => (
                  <button key={q} className="text-[10px] px-2 py-1 rounded-full border border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 bg-slate-900 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-xs flex-1">Écrivez votre message...</span>
                <MessageCircle className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
