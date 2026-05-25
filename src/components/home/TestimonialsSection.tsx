import React from 'react'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Marie D.',
    company: 'Agence événementielle',
    text: "Commande livrée en 48h chrono pour un salon professionnel. Qualité impeccable, bâches parfaitement tendues. Comink, c'est notre imprimeur de confiance.",
    rating: 5,
  },
  {
    name: 'Thomas V.',
    company: 'Promoteur immobilier',
    text: "On travaille avec Comink depuis 3 ans pour tous nos panneaux de chantier. Réactivité exemplaire, prix cohérents et interlocuteur humain disponible.",
    rating: 5,
  },
  {
    name: 'Sophie L.',
    company: 'Responsable marketing',
    text: "J'ai eu un besoin urgent un vendredi soir. Angelo (le chatbot) a répondu en quelques minutes, et la commande était prête le lundi. Bluffant.",
    rating: 5,
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-white py-16 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">ILS NOUS FONT CONFIANCE</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            850+ clients pros.{' '}
            <span className="text-blue-600">Ils en parlent mieux que nous.</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
            </div>
            <span className="text-sm font-bold text-slate-700">4.9 / 5</span>
            <span className="text-sm text-slate-400">· 120+ avis Google</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
