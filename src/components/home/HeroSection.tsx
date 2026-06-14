'use client'

import React, { useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

// ── CMYK brand colors ─────────────────────────────────────────────────────────
const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#060e1f' }

const MARQUEE_ITEMS = [
  'BANDEROLES','BÂCHES','ROLL-UP','DIBOND','FOREX',
  'ADHÉSIFS','DRAPEAUX','PANNEAUX','TOILES','TEXTILE','KAKÉMONOS','VITROPHANIE',
]

const SHOWCASE = [
  {
    label: 'Événements & salons',
    sub: 'Banderoles · Roll-up · Kakémonos',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=90',
    badge: '+200 événements / an',
    accentColor: C.cyan,
  },
  {
    label: 'Chantier & immobilier',
    sub: 'Bâches · Palissades · Panneaux',
    img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=90',
    badge: 'Panneaux · Bâches',
    accentColor: C.magenta,
  },
  {
    label: 'Commerce & retail',
    sub: 'Vitrophanie · PLV · Adhésifs',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=90',
    badge: 'Sur mesure',
    accentColor: C.yellow,
  },
]

// ── Chevrons CMYK ─────────────────────────────────────────────────────────────
function CMYKChevrons() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 480 620"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Cyan */}
      <polygon points="50,0 210,0 160,620 0,620"   fill={C.cyan}    />
      {/* Magenta */}
      <polygon points="160,0 320,0 270,620 110,620" fill={C.magenta} />
      {/* Yellow */}
      <polygon points="270,0 430,0 380,620 220,620" fill={C.yellow}  />
      {/* Coin blanc bas-gauche */}
      <polygon points="0,420 180,620 0,620" fill="white" opacity="0.18"/>
    </svg>
  )
}

// ── Grille de photos avec parallax ───────────────────────────────────────────
function ShowcaseGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 50, damping: 20 })
  const springY = useSpring(rawY, { stiffness: 50, damping: 20 })
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = containerRef.current?.getBoundingClientRect()
    if (!r) return
    rawX.set((e.clientX - r.left - r.width / 2) / r.width)
    rawY.set((e.clientY - r.top  - r.height / 2) / r.height)
  }, [rawX, rawY])

  return (
    <div
      ref={containerRef}
      className="hidden lg:block relative self-center"
      onMouseMove={onMouseMove}
      onMouseLeave={() => { rawX.set(0); rawY.set(0) }}
      style={{ perspective: '1200px' }}
    >
      {/* Bloc CMYK derrière les photos */}
      <div className="absolute -inset-3 rounded-3xl overflow-hidden opacity-90">
        <CMYKChevrons />
      </div>

      <motion.div style={{ rotateX, rotateY }} className="relative grid grid-cols-2 gap-3">
        {/* Grande photo */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ height: 380, gridRow: 'span 2' }}>
          <img src={SHOWCASE[0].img} alt={SHOWCASE[0].label}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block text-white text-[10px] font-black px-2.5 py-1 rounded-full mb-2 uppercase tracking-wider"
              style={{ background: `${SHOWCASE[0].accentColor}cc` }}>
              {SHOWCASE[0].badge}
            </span>
            <p className="text-white font-black text-lg leading-tight">{SHOWCASE[0].label}</p>
            <p className="text-slate-300 text-xs mt-0.5">{SHOWCASE[0].sub}</p>
          </div>
        </div>
        {/* 2 petites */}
        <div className="flex flex-col gap-3">
          {SHOWCASE.slice(1).map(item => (
            <div key={item.label} className="relative rounded-2xl overflow-hidden flex-1 shadow-2xl" style={{ height: 182 }}>
              <img src={item.img} alt={item.label}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="inline-block text-white text-[9px] font-black px-2 py-0.5 rounded-full mb-1.5 uppercase tracking-wider"
                  style={{ background: `${item.accentColor}cc` }}>
                  {item.badge}
                </span>
                <p className="text-white font-bold text-sm leading-tight">{item.label}</p>
                <p className="text-slate-300 text-[10px]">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pill contact */}
      <div className="relative mt-3 flex items-center justify-between rounded-2xl px-5 py-4 backdrop-blur-sm"
        style={{ background: 'rgba(6,14,31,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <p className="text-white text-sm font-bold">Un projet à discuter ?</p>
          <p className="text-slate-400 text-xs">On vous répond par mail ou téléphone</p>
        </div>
        <Link href="/devis" className="font-black text-sm hover:opacity-80 transition-opacity whitespace-nowrap"
          style={{ color: C.yellow }}>
          Demander un devis →
        </Link>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function HeroSection() {
  return (
    <section
      className="relative text-white overflow-hidden flex flex-col"
      style={{ background: C.navy, height: 'calc(100dvh - 100px)', minHeight: '580px' }}
    >
      {/* Gradient de lisibilité à gauche */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(6,14,31,1) 0%, rgba(6,14,31,0.75) 48%, transparent 100%)' }} />

      {/* Dot grid */}
      <div className="absolute inset-0 z-[2] opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />

      {/* Glow cyan subtil */}
      <div className="absolute top-0 right-1/3 w-[700px] h-[500px] rounded-full blur-[180px] pointer-events-none z-[1]"
        style={{ background: `${C.cyan}10` }} />

      {/* ── Contenu ── */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center">
        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-16 py-6 items-center">

          {/* Texte */}
          <div className="flex flex-col justify-center">

            {/* H1 */}
            <h1 className="text-[3.4rem] sm:text-[5rem] lg:text-[6.2rem] font-black tracking-[-0.04em] leading-[0.88] mb-5">
              {[
                { text: "L'IMPRIMERIE", delay: 0 },
                { text: 'GRAND FORMAT', delay: 0.07 },
                { text: 'DE',           delay: 0.14 },
              ].map(({ text, delay }) => (
                <motion.span key={text} className="block text-white"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
                  {text}
                </motion.span>
              ))}
              <motion.span
                className="block"
                style={{ color: C.yellow }}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.21, ease: [0.22, 1, 0.36, 1] }}>
                LIÈGE.
              </motion.span>
            </h1>

            {/* Barre jaune signature */}
            <motion.div
              className="h-[3px] rounded-full mb-6"
              style={{ background: C.yellow, width: 64 }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.45 }}
            />

            {/* Sous-titre */}
            <motion.p
              className="text-slate-400 text-base leading-relaxed mb-7 max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              Bâches, banderoles, roll-ups, adhésifs et plus. Commande en ligne, production locale à Liège.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-3 mb-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
            >
              <Link href="/catalogue"
                className="group relative flex items-center gap-2 font-black px-7 py-3.5 rounded-xl transition-all text-sm hover:-translate-y-0.5 overflow-hidden text-slate-900"
                style={{ background: C.yellow, boxShadow: `0 8px 32px ${C.yellow}45` }}>
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
                Voir nos produits
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/devis"
                className="flex items-center gap-2 text-slate-200 font-bold px-7 py-3.5 rounded-xl transition-all text-sm hover:-translate-y-0.5"
                style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
                Demander un devis
              </Link>
            </motion.div>

            {/* Trust bar CMYK */}
            <motion.div
              className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              {[
                { label: 'Production locale', color: C.cyan    },
                { label: 'Qualité garantie',  color: C.magenta },
                { label: 'Devis en 2h',       color: C.yellow  },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  {t.label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Photos */}
          <ShowcaseGrid />
        </div>
      </div>

      {/* ── Marquee CMYK ── */}
      <div className="relative z-10 overflow-hidden py-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,14,31,0.97)' }}>
        <div className="flex whitespace-nowrap"
          style={{ animation: 'marquee 26s linear infinite', willChange: 'transform' }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => {
            const colors = [C.cyan, C.magenta, C.yellow]
            const col = colors[i % 3]
            return (
              <span key={i} className="flex items-center">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] px-5"
                  style={{ color: col, opacity: 0.75 }}>
                  {item}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '8px' }}>◆</span>
              </span>
            )
          })}
        </div>
        <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </div>
    </section>
  )
}
