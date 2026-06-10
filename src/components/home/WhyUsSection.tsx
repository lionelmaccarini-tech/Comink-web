'use client'

import React from 'react'
import { Clock, MapPin, Lightbulb, HeadphonesIcon, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const C = { cyan: '#00AEEF', magenta: '#E4007C', yellow: '#F5C400', navy: '#060e1f' }

const features = [
  { icon: Clock,           title: 'Délais respectés',    desc: 'Même les délais serrés. Nos engagements sont gravés dans le marbre.',              color: C.cyan    },
  { icon: MapPin,          title: 'Production locale',   desc: 'Tout est produit à Liège. Contrôle qualité direct, zéro intermédiaire.',            color: C.magenta },
  { icon: Lightbulb,       title: 'Conseils sur-mesure', desc: 'On vous guide vers le bon produit pour votre budget et votre usage.',               color: C.yellow  },
  { icon: HeadphonesIcon,  title: 'Support humain',      desc: "Angelo, notre IA, répond 24h/24. L'équipe humaine prend le relais.",                color: C.cyan    },
  { icon: ShieldCheck,     title: 'Qualité garantie',    desc: "Pas satisfait ? On refait ou on rembourse. Sans discussion.",                       color: C.magenta },
  { icon: Zap,             title: 'Express disponible',  desc: 'Commandez avant 14h, livraison ou enlèvement possible dès le lendemain.',            color: C.yellow  },
]

const STATS = [
  { value: '+2 000', label: 'clients actifs',      color: C.cyan    },
  { value: '15 ans', label: "d'expérience",        color: C.magenta },
  { value: '< 2h',   label: 'délai devis moyen',   color: C.yellow  },
  { value: '99%',    label: 'clients satisfaits',  color: C.cyan    },
]

export default function WhyUsSection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#060e1f' }}>

      {/* Ligne CMYK */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex">
        <div className="flex-1" style={{ background: C.yellow }} />
        <div className="flex-1" style={{ background: C.cyan }} />
        <div className="flex-1" style={{ background: C.magenta }} />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      {/* Glow */}
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: `${C.magenta}08` }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: C.magenta }}>
            ◆ POURQUOI COMINK
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            L'imprimerie qui va<br />
            <span style={{ color: C.yellow }}>au bout des choses.</span>
          </h2>
          <div className="mx-auto mt-5 h-[3px] rounded-full w-12" style={{ background: C.yellow }} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {STATS.map(s => (
            <motion.div key={s.value} className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}25` }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={f.title} className="group rounded-2xl p-6 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}>
                  <Icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div className="w-8 h-[2px] rounded-full mb-3" style={{ background: f.color }} />
                <h3 className="text-sm font-black text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
