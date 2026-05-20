'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, MapPin, HeadphonesIcon, Star } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-900 text-white min-h-[580px] flex items-center">
      <div className="absolute inset-0">
        <img
          src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/ec5cf922b_IMG_0629.jpg"
          alt="Imprimerie grand format Comink"
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
      </div>

      {/* Badge top-right */}
      <div className="absolute top-6 right-6 md:top-10 md:right-16 z-10 hidden md:flex flex-col items-end">
        <div className="bg-black/70 border border-white/20 rounded-xl px-6 py-4 text-right backdrop-blur-sm">
          <p className="text-white text-2xl font-black leading-tight">ON IMPRIME.</p>
          <p className="text-white text-2xl font-black leading-tight">ON LIVRE.</p>
          <p className="text-blue-400 text-2xl font-black leading-tight">VOTRE PROJET DEVIENT LE NÔTRE.</p>
          <div className="mt-2 flex items-center justify-end gap-1">
            <div className="w-6 h-0.5 bg-blue-400" />
            <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">COMINK</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">IMPRESSION GRAND FORMAT</p>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Imprimerie grand format · Liège</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Votre projet,<br />
            <span className="font-extrabold">imprimé sans stress.</span><br />
            <span className="text-blue-400 font-extrabold">Même dans l'urgence.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-8 max-w-md">
            L'impression grand format pensée pour les pros exigeants. Rapide, fiable et assumée jusqu'au bout.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/catalogue"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/30"
            >
              Voir nos solutions <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-5 text-xs text-slate-300 mb-6">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> Livraison express</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Production locale à Liège</span>
            <span className="flex items-center gap-1.5"><HeadphonesIcon className="w-3.5 h-3.5 text-green-400" /> Support 7j/7</span>
          </div>

          {/* Preuve sociale */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 w-fit">
            <div className="flex -space-x-2">
              {['M', 'T', 'S', 'L'].map((l) => (
                <div key={l} className="w-7 h-7 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">{l}</div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                <span className="text-white text-xs font-bold ml-1">4.9</span>
              </div>
              <p className="text-slate-300 text-[10px]">+850 clients pros satisfaits</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
