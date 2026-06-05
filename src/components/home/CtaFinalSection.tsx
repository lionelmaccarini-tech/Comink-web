'use client'

import React, { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ShoppingCart, FileText, Zap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

function MagneticButton({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left - rect.width  / 2) * 0.3
    const y = (e.clientY - rect.top  - rect.height / 2) * 0.3
    setPos({ x, y })
  }, [])

  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x: pos.x, y: pos.y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.a>
  )
}

export default function CtaFinalSection() {
  return (
    <section className="relative overflow-hidden py-24" style={{ background: 'linear-gradient(135deg, #0c1a3a 0%, #111827 60%, #0f172a 100%)' }}>

      {/* Dot pattern subtil */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
      />

      {/* Accent glow bleu doux */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/12 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Cercles décoratifs discrets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border border-white/[0.04]"
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full border border-white/[0.04]"
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
            <span className="text-white text-xs font-bold">Production locale · Qualité garantie · Conseil personnalisé</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Un projet à imprimer ?
          </h2>

          <p className="text-slate-400 text-lg mb-12 max-w-lg mx-auto leading-relaxed">
            Commandez en ligne ou demandez un devis personnalisé.
            On vous accompagne pour trouver le bon produit.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <MagneticButton
            href="/commande-rapide"
            className="group relative flex items-center gap-2.5 bg-blue-500 hover:bg-blue-400 text-white font-black px-9 py-4 rounded-2xl transition-colors shadow-xl shadow-blue-900/40 text-sm overflow-hidden cursor-pointer"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]" />
            <ShoppingCart className="w-4 h-4" />
            Commander maintenant
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </MagneticButton>

          <MagneticButton
            href="/devis"
            className="flex items-center gap-2.5 border border-slate-600 hover:border-slate-400 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-bold px-9 py-4 rounded-2xl transition-all text-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Demander un devis gratuit
          </MagneticButton>
        </motion.div>

        <motion.p
          className="text-slate-700 text-xs mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Pas de compte requis · Devis sans engagement · Production à Liège
        </motion.p>
      </div>
    </section>
  )
}
