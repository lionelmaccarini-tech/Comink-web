'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Clock, MapPin, Lightbulb, HeadphonesIcon, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import TiltCard from '@/components/ui/TiltCard'

const features = [
  { icon: Clock,          title: 'Délais respectés',    desc: "Même les délais serrés. Nos engagements sont gravés dans le marbre.",         accent: '#60a5fa', glow: 'rgba(96,165,250,0.15)' },
  { icon: MapPin,         title: 'Production locale',   desc: 'Tout est produit à Liège. Contrôle qualité direct, zéro intermédiaire.',       accent: '#34d399', glow: 'rgba(52,211,153,0.15)' },
  { icon: Lightbulb,      title: 'Conseils sur-mesure', desc: 'On vous guide vers le bon produit pour votre budget et votre usage.',           accent: '#fbbf24', glow: 'rgba(251,191,36,0.15)'  },
  { icon: HeadphonesIcon, title: 'Support 7j/7',        desc: "Angelo, notre IA, répond 24h/24. L'équipe humaine prend le relais.",            accent: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
  { icon: ShieldCheck,    title: 'Qualité garantie',    desc: 'Pas satisfait ? On refait ou on rembourse. Sans discussion.',                   accent: '#f87171', glow: 'rgba(248,113,113,0.15)' },
  { icon: Zap,            title: 'Express disponible',  desc: 'Commandez avant 14h, livraison ou enlèvement possible dès le lendemain.',       accent: '#fb923c', glow: 'rgba(251,146,60,0.15)'  },
]

function SpotlightSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState({ x: 0, y: 0, active: false })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true })
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSpot(s => ({ ...s, active: false }))}
    >
      {/* Cursor spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-[inherit]"
        style={{
          opacity: spot.active ? 1 : 0,
          background: `radial-gradient(600px circle at ${spot.x}px ${spot.y}px, rgba(59,130,246,0.08), transparent 70%)`,
        }}
      />
      {children}
    </div>
  )
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function WhyUsSection() {
  return (
    <section className="py-24 bg-[#060b18] relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-violet-600/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="grid lg:grid-cols-[320px_1fr] gap-12 items-start mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">POURQUOI COMINK ?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Plus qu'un imprimeur.{' '}
              <span className="text-blue-400">Un partenaire qui assure.</span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed self-end">
            On ne fait pas semblant. Chaque engagement qu'on prend, on le tient.
            C'est comme ça depuis 10 ans, et c'est pas près de changer.
          </p>
        </motion.div>

        {/* Spotlight + cards */}
        <SpotlightSection>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map(f => (
              <motion.div key={f.title} variants={cardVariants}>
                <TiltCard
                  intensity={8}
                  scale={1.03}
                  className="h-full"
                >
                  <div
                    className="h-full p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors duration-300 group"
                    style={{ '--glow': f.glow } as React.CSSProperties}
                  >
                    {/* Icon with glow */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: f.glow, border: `1px solid ${f.accent}22` }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                    </div>

                    <p className="text-white font-bold text-sm mb-2">{f.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>

                    {/* Accent line on hover */}
                    <div
                      className="mt-4 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }}
                    />
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </SpotlightSection>
      </div>
    </section>
  )
}
