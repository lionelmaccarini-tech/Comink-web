import React from 'react'
import { Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Marie D.',
    company: 'Agence événementielle',
    initials: 'MD',
    color: 'bg-blue-600',
    text: "Commande livrée en 48h chrono pour un salon professionnel. Qualité impeccable, bâches parfaitement tendues. Comink, c'est notre imprimeur de confiance depuis 3 ans.",
    tag: 'Livraison express',
  },
  {
    name: 'Thomas V.',
    company: 'Promoteur immobilier',
    initials: 'TV',
    color: 'bg-emerald-600',
    text: "On travaille avec Comink pour tous nos panneaux de chantier. Réactivité exemplaire, prix cohérents et interlocuteur humain disponible. Jamais eu un retard.",
    tag: 'Client fidèle',
  },
  {
    name: 'Sophie L.',
    company: 'Responsable marketing',
    initials: 'SL',
    color: 'bg-violet-600',
    text: "Besoin urgent un vendredi soir. Angelo a répondu en quelques minutes, la commande était prête le lundi. Le genre de service qu'on ne trouve nulle part ailleurs.",
    tag: 'Support 7j/7',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-slate-50 py-20 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">CE QUE NOS CLIENTS DISENT</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
            Ils parlent mieux que nous.
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div
              key={t.name}
              className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <Quote className="w-8 h-8 text-blue-100 mb-4 group-hover:text-blue-200 transition-colors" />

              <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5">
                "{t.text}"
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.company}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
                  {t.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
