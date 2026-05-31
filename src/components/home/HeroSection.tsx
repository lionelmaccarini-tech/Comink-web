'use client'

import React, { useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Zap } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

// ── Marquee items ─────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = ['BANDEROLES','BÂCHES','ROLL-UP','DIBOND','FOREX','ADHÉSIFS','DRAPEAUX','PANNEAUX','TOILES','TEXTILE','KAKÉMONOS','VITROPHANIE']

// ── Photos — signage / printing / grand format context ───────────────────────

const SHOWCASE = [
  {
    label: 'Événements & salons',
    sub: 'Banderoles · Roll-up · Kakémonos',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=90',
    badge: '+200 événements / an',
    large: true,
  },
  {
    label: 'Chantier & immobilier',
    sub: 'Bâches · Palissades · Panneaux',
    img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=90',
    badge: 'Livraison express',
    large: false,
  },
  {
    label: 'Commerce & retail',
    sub: 'Vitrophanie · PLV · Adhésifs',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=90',
    badge: 'Sur mesure',
    large: false,
  },
]

// ── Parallax photo grid ───────────────────────────────────────────────────────

function ShowcaseGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 50, damping: 20 })
  const springY = useSpring(rawY, { stiffness: 50, damping: 20 })
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      rawX.set((e.clientX - rect.left - rect.width / 2) / rect.width)
      rawY.set((e.clientY - rect.top - rect.height / 2) / rect.height)
    },
    [rawX, rawY],
  )

  return (
    <div
      ref={containerRef}
      className="hidden lg:flex flex-col gap-3 self-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        rawX.set(0)
        rawY.set(0)
      }}
      style={{ perspective: '1200px' }}
    >
      <motion.div style={{ rotateX, rotateY }} className="grid grid-cols-2 gap-3">
        {/* Grande photo — span 2 rows */}
        <div
          className="relative rounded-2xl overflow-hidden row-span-2"
          style={{ height: 380 }}
        >
          <img
            src={SHOWCASE[0].img}
            alt={SHOWCASE[0].label}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
              <Zap className="w-3 h-3 text-orange-400" />
              {SHOWCASE[0].badge}
            </span>
            <p className="text-white font-black text-lg leading-tight">{SHOWCASE[0].label}</p>
            <p className="text-slate-300 text-xs mt-0.5">{SHOWCASE[0].sub}</p>
          </div>
        </div>

        {/* 2 petites photos */}
        <div className="flex flex-col gap-3">
          {SHOWCASE.slice(1).map(item => (
            <div
              key={item.label}
              className="relative rounded-2xl overflow-hidden flex-1"
              style={{ height: 182 }}
            >
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="inline-block bg-white/15 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1.5">
                  {item.badge}
                </span>
                <p className="text-white font-bold text-sm leading-tight">{item.label}</p>
                <p className="text-slate-300 text-[10px]">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Badge urgence */}
      <motion.div
        className="flex items-center justify-between bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-4"
        initial={{ opacity: 1, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">Urgence ? On gère.</p>
            <p className="text-slate-400 text-xs">Devis en 2h · Production dès J+1</p>
          </div>
        </div>
        <a
          href="tel:+3242330138"
          className="text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          +32 4 233 01 38
        </a>
      </motion.div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  return (
    <section
      className="relative bg-[#080c14] text-white overflow-hidden flex flex-col"
      style={{ height: 'calc(100dvh - 100px)', minHeight: '560px' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Ambient glow bleu-violet */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Contenu principal ── */}
      <div className="relative flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center">
        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-12 py-6 lg:py-8 items-center">

          {/* ── Colonne texte ── */}
          <div className="flex flex-col justify-center self-center">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-3 w-fit">
              <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <MapPin className="w-3 h-3" />
                LIÈGE · BELGIQUE · DEPUIS 2014
              </span>
            </div>

            {/* H1 — editorial bold */}
            <h1 className="text-[2.8rem] sm:text-[4rem] lg:text-[4.8rem] font-black tracking-[-0.03em] leading-[0.92] mb-4">
              <motion.span
                className="block text-white"
                initial={{ opacity: 1, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                L'IMPRIMERIE
              </motion.span>
              <motion.span
                className="block text-white"
                initial={{ opacity: 1, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                GRAND FORMAT
              </motion.span>
              <motion.span
                className="block text-white"
                initial={{ opacity: 1, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                QUI LIVRE
              </motion.span>
              <motion.span
                className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400"
                initial={{ opacity: 1, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                DEMAIN.
              </motion.span>
            </h1>

            {/* Sous-titre */}
            <p className="text-sm text-slate-400 leading-relaxed mb-4 max-w-md">
              Banderoles, bâches, roll-up&hellip;{' '}
              <span className="text-slate-300 font-medium">Tout en local à Liège.</span>{' '}
              Même les urgences.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                href="/catalogue"
                className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
                Voir nos produits
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/devis"
                className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-bold px-6 py-3 rounded-xl transition-all text-sm hover:-translate-y-0.5"
              >
                Devis gratuit en 2h
              </Link>
            </div>

            {/* Trust bar condensée — live + différenciateurs sur une ligne */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-green-400" />
                </span>
                Express disponible aujourd'hui
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                10 ans · Liège
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                Devis en 2h
              </div>
            </div>
          </div>

          {/* ── Colonne photos ── */}
          <ShowcaseGrid />
        </div>
      </div>

      {/* ── Marquee strip — bas du hero ─────────────────────────────────────── */}
      <div className="relative border-t border-white/[0.06] bg-[#0a0f1e] overflow-hidden py-3" aria-hidden="true">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'marquee 28s linear infinite', willChange: 'transform' }}
        >
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="text-sm font-black uppercase tracking-[0.2em] text-white/50 px-4">{item}</span>
              <span className="text-white/20 font-black text-xs">·</span>
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
      </div>
    </section>
  )
}
