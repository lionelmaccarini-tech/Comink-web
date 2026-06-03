'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, FileText, ChevronRight, X } from 'lucide-react'

export default function FloatingSidebar() {
  const [expanded, setExpanded] = useState(false)
  const [closed, setClosed] = useState(false)

  if (closed) return null

  return (
    <motion.div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Bouton fermer (visible quand expandé) */}
      <AnimatePresence>
        {expanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setClosed(true)}
            className="absolute -top-3 -left-3 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 z-50 transition-colors"
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Barre principale */}
      <motion.div
        className="relative flex flex-col items-center rounded-l-2xl overflow-hidden cursor-pointer shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #0f1729 0%, #0c1a3a 100%)', border: '1px solid rgba(59,130,246,0.2)', borderRight: 'none' }}
        animate={{ width: expanded ? 200 : 44 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => !expanded && setExpanded(true)}
      >
        {!expanded ? (
          /* Version collapsed — strip vertical */
          <div className="flex flex-col items-center py-5 gap-5 w-full">
            {/* Indicateur live */}
            <div className="relative">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
            </div>

            {/* Texte vertical */}
            <div
              className="text-[9px] font-black tracking-[0.2em] text-blue-400 uppercase select-none"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
            >
              CONTACT RAPIDE
            </div>

            {/* Icône téléphone */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center"
            >
              <Phone className="w-3 h-3 text-blue-400" />
            </motion.div>

            {/* Chevron animé */}
            <motion.div
              animate={{ x: [-2, 0, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </motion.div>
          </div>
        ) : (
          /* Version expanded */
          <motion.div
            className="flex flex-col p-4 gap-4 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-[10px] text-green-400 font-bold">Disponible</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setExpanded(false) }}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Téléphone */}
            <a
              href="tel:+3242330138"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/20 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/50 transition-colors">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Appeler</p>
                <p className="text-[11px] text-white font-bold leading-tight">+32 4 233 01 38</p>
              </div>
            </a>

            {/* Devis rapide */}
            <Link
              href="/devis"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-600/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600/50 transition-colors">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Gratuit</p>
                <p className="text-[11px] text-white font-bold leading-tight">Devis rapide</p>
              </div>
            </Link>

            {/* Commande rapide */}
            <Link
              href="/commande-rapide"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/50 hover:border-yellow-500/30 transition-colors group"
            >
              <div className="w-5 h-5 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px]">⚡</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors font-semibold">Commande rapide</p>
            </Link>

            {/* Vérifier fichier */}
            <Link
              href="/verifier-fichier"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors group"
            >
              <div className="w-5 h-5 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px]">🔍</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors font-semibold">Vérifier mon fichier</p>
            </Link>

            {/* Separator */}
            <div className="h-px bg-slate-800" />

            {/* Scroll to top */}
            <button
              onClick={e => { e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              <span>↑</span> Haut de page
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
