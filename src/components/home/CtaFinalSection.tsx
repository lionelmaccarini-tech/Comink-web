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
    <section className="relative overflow-hidden bg-blue-600 py-24">

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />

      {/* 3D depth layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large back circle */}
        <motion.div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        />
        {/* Medium circle */}
        <motion.div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full border border-white/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-white/8 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-white text-xs font-bold">Devis sous 2h · Production à Liège · Livraison express</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Prêt à lancer<br />votre projet ?
          </h2>

          <p className="text-blue-100/80 text-lg mb-12 max-w-lg mx-auto leading-relaxed">
            Commandez en ligne en 5 minutes ou demandez un devis personnalisé.
            On répond vite. On livre encore plus vite.
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
            href="/commande"
            className="group relative flex items-center gap-2.5 bg-white hover:bg-blue-50 text-blue-700 font-black px-9 py-4 rounded-2xl transition-colors shadow-2xl shadow-blue-900/30 text-sm overflow-hidden cursor-pointer"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-blue-100/50 to-transparent skew-x-[-20deg]" />
            <ShoppingCart className="w-4 h-4" />
            Commander maintenant
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </MagneticButton>

          <MagneticButton
            href="/devis"
            className="flex items-center gap-2.5 border-2 border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 text-white font-bold px-9 py-4 rounded-2xl transition-all text-sm backdrop-blur-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Demander un devis gratuit
          </MagneticButton>
        </motion.div>

        <motion.p
          className="text-blue-200/60 text-xs mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Pas de compte requis · Réponse garantie en moins de 2h · Annulation sans frais
        </motion.p>
      </div>
    </section>
  )
}
