'use client'

import React, { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ShoppingCart, FileText, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const C = { cyan: '#00AEEF', magenta: '#E4007C', yellow: '#F5C400', navy: '#060e1f' }

// Chevrons CMYK décoratifs (version compacte)
function CMYKAccent({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon points="30,0 120,0 90,400 0,400"   fill={C.cyan}    opacity="0.85"/>
      <polygon points="100,0 190,0 160,400 70,400" fill={C.magenta} opacity="0.85"/>
      <polygon points="170,0 260,0 230,400 140,400" fill={C.yellow}  opacity="0.85"/>
      <polygon points="190,300 300,160 300,400 130,400" fill="white" opacity="0.1"/>
    </svg>
  )
}

export default function CtaFinalSection() {
  return (
    <section className="relative overflow-hidden py-28" style={{ background: '#09111f' }}>

      {/* Ligne CMYK */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex">
        <div className="flex-1" style={{ background: C.cyan }} />
        <div className="flex-1" style={{ background: C.yellow }} />
        <div className="flex-1" style={{ background: C.magenta }} />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      {/* Chevrons CMYK gauche */}
      <div className="absolute left-0 top-0 bottom-0 w-40 overflow-hidden opacity-30 pointer-events-none">
        <CMYKAccent className="absolute left-0 top-0 h-full w-full" />
      </div>

      {/* Chevrons CMYK droite */}
      <div className="absolute right-0 top-0 bottom-0 w-40 overflow-hidden opacity-30 pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}>
        <CMYKAccent className="absolute left-0 top-0 h-full w-full" />
      </div>

      {/* Glow cyan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: `${C.cyan}10` }} />

      <div className="relative max-w-3xl mx-auto px-4 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: C.cyan }} />
            <span className="text-white text-xs font-bold">Production locale · Qualité garantie · Conseil personnalisé</span>
            <span className="w-2 h-2 rounded-full" style={{ background: C.magenta }} />
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Un projet à imprimer ?
          </h2>
          {/* Barre jaune */}
          <div className="mx-auto mb-6 h-[3px] rounded-full w-12" style={{ background: C.yellow }} />

          <p className="text-slate-400 text-lg mb-12 max-w-md mx-auto leading-relaxed">
            Commandez en ligne ou demandez un devis personnalisé. On vous accompagne du fichier à la livraison.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* CTA jaune principal */}
          <Link href="/commande-rapide"
            className="group relative flex items-center gap-2.5 font-black px-9 py-4 rounded-2xl transition-all text-sm hover:-translate-y-0.5 overflow-hidden text-slate-900 shadow-2xl"
            style={{ background: C.yellow, boxShadow: `0 12px 40px ${C.yellow}40` }}>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
            <ShoppingCart className="w-4 h-4" />
            Commander maintenant
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* CTA secondaire */}
          <Link href="/devis"
            className="flex items-center gap-2.5 text-slate-200 font-bold px-9 py-4 rounded-2xl transition-all text-sm hover:-translate-y-0.5"
            style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
            <FileText className="w-4 h-4" />
            Devis gratuit
          </Link>
        </motion.div>

        <motion.p className="text-slate-700 text-xs mt-10"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.5 }}>
          Pas de compte requis · Sans engagement · Production à Liège (Awans)
        </motion.p>

      </div>
    </section>
  )
}
