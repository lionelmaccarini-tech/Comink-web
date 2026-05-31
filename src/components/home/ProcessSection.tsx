'use client'

import React from 'react'
import Link from 'next/link'
import { FileUp, SlidersHorizontal, Truck, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

// ── Mockup : lignes auto-détectées ───────────────────────────────────────────

const MOCK_LINES = [
  { name: 'Visuel_Stand_A.pdf',  w: '200', h: '100', pages: 1 },
  { name: 'Vitrine_B.pdf',       w: '150', h: '80',  pages: 1 },
  { name: 'Bache_Event.pdf',     w: '300', h: '150', pages: 1 },
]

function AutoDetectMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl text-xs">
      {/* Fake toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-slate-400 text-[10px] font-mono">comink.be/commande-rapide</span>
      </div>

      {/* Drop zone */}
      <div className="px-4 pt-3 pb-2">
        <motion.div
          className="border-2 border-dashed border-blue-500/40 bg-blue-500/5 rounded-xl px-4 py-3 flex items-center gap-3"
          animate={{ borderColor: ['rgba(59,130,246,0.4)', 'rgba(59,130,246,0.8)', 'rgba(59,130,246,0.4)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <FileUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-[11px]">Déposez vos PDF ici</p>
            <p className="text-slate-400 text-[10px]">Formats détectés automatiquement</p>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-blue-600 rounded-lg px-2.5 py-1">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="text-white text-[10px] font-bold">IA</span>
          </div>
        </motion.div>
      </div>

      {/* Auto-detected lines */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-slate-500 text-[9px] uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
          3 visuels détectés automatiquement
        </p>
        {MOCK_LINES.map((line, i) => (
          <motion.div
            key={line.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.25, duration: 0.4 }}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          >
            {/* File */}
            <div className="w-5 h-6 bg-blue-500/20 border border-blue-500/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-[7px] text-blue-400 font-bold leading-none">PDF</span>
            </div>
            {/* Name */}
            <span className="text-slate-300 text-[10px] truncate flex-1 font-mono">{line.name}</span>
            {/* Dims badge */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded px-1.5 py-0.5 text-[9px] font-bold">
                {line.w} × {line.h} cm
              </span>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </div>
          </motion.div>
        ))}
        <p className="text-[9px] text-slate-500 pt-1 text-center">
          ↳ Reste à choisir : produit · finitions · délai
        </p>
      </div>
    </div>
  )
}

// ── Configure mockup ──────────────────────────────────────────────────────────

function ConfigureMockup() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl text-xs">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-slate-600 font-bold text-[11px]">Ligne 1 — Bâche fontlit 510gr</span>
        <span className="text-blue-600 font-bold text-[10px]">200 × 100 cm</span>
      </div>
      <div className="p-3 space-y-2.5">
        {/* Finitions */}
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5">Finitions</p>
          <div className="flex gap-1.5 flex-wrap">
            {['Ourlet tout autour', 'Œillets alu'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="bg-blue-50 border-2 border-blue-500 text-blue-700 rounded-lg px-2 py-0.5 text-[9px] font-bold"
              >
                ✓ {f}
              </motion.span>
            ))}
            <span className="border border-slate-200 text-slate-400 rounded-lg px-2 py-0.5 text-[9px]">
              Bande de renfort
            </span>
          </div>
        </div>
        {/* Délai */}
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5">Délai</p>
          <div className="flex gap-1.5">
            {['Standard 5j', 'Express 2j', 'Urgent 24h'].map((d, i) => (
              <span
                key={d}
                className={`rounded-lg px-2 py-0.5 text-[9px] font-bold border ${
                  i === 1
                    ? 'bg-violet-50 border-violet-400 text-violet-700'
                    : 'border-slate-200 text-slate-400'
                }`}
              >
                {i === 1 && '✓ '}{d}
              </span>
            ))}
          </div>
        </div>
        {/* Qty */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Quantité</span>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold text-[11px]">−</span>
            <span className="text-slate-900 font-black text-sm">1</span>
            <span className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold text-[11px]">+</span>
          </div>
          <motion.span
            className="text-blue-700 font-black text-[13px]"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            87,50 €
          </motion.span>
        </div>
      </div>
    </div>
  )
}

// ── Steps data ────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    icon: FileUp,
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.25)',
    title: 'Déposez votre PDF',
    tagline: 'Un fichier = une ligne',
    desc: 'Uploadez un ou plusieurs PDF. Les dimensions de chaque page sont lues automatiquement — une ligne de commande est créée par visuel. Zéro saisie manuelle.',
    detail: 'Détection auto',
    mockup: <AutoDetectMockup />,
  },
  {
    number: '02',
    icon: SlidersHorizontal,
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.18)',
    border: 'rgba(139,92,246,0.25)',
    title: 'Configurez chaque ligne',
    tagline: '2 minutes par visuel',
    desc: 'Choisissez le type de support, les finitions (ourlets, œillets, bande de renfort…) et le délai. Le prix se calcule en temps réel.',
    detail: 'Prix en direct',
    mockup: <ConfigureMockup />,
  },
  {
    number: '03',
    icon: Truck,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.25)',
    title: 'On imprime et livrons',
    tagline: 'Dès le lendemain',
    desc: "Commandez, payez, c'est parti. Production à Liège dès réception du paiement. Enlèvement sur place ou livraison express — vous suivez l'avancement.",
    detail: 'Dès J+1',
    mockup: null,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProcessSection() {
  return (
    <section className="bg-white py-24 border-b border-slate-100 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">SIMPLE COMME BONJOUR</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                Déposez votre PDF.<br />
                <span className="text-blue-600">Les lignes se créent toutes seules.</span>
              </h2>
            </div>
            <Link
              href="/commande-rapide"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20 whitespace-nowrap self-start md:self-auto"
            >
              Essayer la commande rapide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-0 md:grid md:grid-cols-3 md:gap-8 relative">

          {/* Connecting line desktop */}
          <div className="hidden md:block absolute top-[44px] left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-[2px] z-0 overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: 'repeating-linear-gradient(90deg, #e2e8f0 0, #e2e8f0 8px, transparent 8px, transparent 18px)' }}
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative flex flex-col gap-5 z-10"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Icon */}
              <motion.div
                className="relative w-fit"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.9 }}
              >
                <div className="absolute -inset-3 rounded-3xl blur-xl opacity-50" style={{ background: step.glow }} />
                <div
                  className="relative w-[88px] h-[88px] rounded-2xl flex items-center justify-center"
                  style={{ background: step.glow, border: `1.5px solid ${step.border}`, boxShadow: `0 8px 32px ${step.glow}` }}
                >
                  <step.icon className="w-9 h-9" style={{ color: step.accent }} />
                </div>
                <div
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                  style={{ background: step.accent }}
                >
                  {i + 1}
                </div>
              </motion.div>

              {/* Big ghost number */}
              <span className="text-6xl font-black leading-none select-none -mb-2" style={{ color: `${step.accent}12` }}>
                {step.number}
              </span>

              {/* Text */}
              <div className="-mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: step.accent }}>
                  {step.tagline}
                </p>
                <p className="text-slate-900 font-bold text-base mb-2">{step.title}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                <motion.span
                  className="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ color: step.accent, background: step.glow, border: `1px solid ${step.border}` }}
                  whileHover={{ scale: 1.05 }}
                >
                  {step.detail}
                </motion.span>
              </div>

              {/* Mockup preview */}
              {step.mockup && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                  className="mt-2"
                >
                  {step.mockup}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom callout */}
        <motion.div
          className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <p className="text-slate-900 font-bold text-sm">
              ⚡ Commande multi-visuels en quelques minutes
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              Un PDF multi-pages ? Chaque page devient automatiquement une ligne. Plus besoin de tout ressaisir.
            </p>
          </div>
          <Link
            href="/commande-rapide"
            className="flex-shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Tester maintenant <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>
    </section>
  )
}
