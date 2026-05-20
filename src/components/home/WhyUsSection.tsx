import React from 'react'
import { Clock, MapPin, Lightbulb, HeadphonesIcon } from 'lucide-react'

const features = [
  {
    icon: Clock,
    title: 'Délais respectés',
    desc: 'Même les délais serrés. On tient nos engagements, sans exception.',
  },
  {
    icon: MapPin,
    title: 'Production locale',
    desc: 'Tout est produit à Liège. Contrôle qualité direct, zéro intermédiaire.',
  },
  {
    icon: Lightbulb,
    title: 'Conseils personnalisés',
    desc: 'On vous guide vers le bon produit pour votre budget et votre usage.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Support 7j/7',
    desc: "Roger, notre IA, répond en continu. L'équipe humaine prend le relais.",
  },
]

export default function WhyUsSection() {
  return (
    <section className="py-14 bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="md:w-72 flex-shrink-0">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">POURQUOI CHOISIR COMINK ?</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              Plus qu'un imprimeur,{' '}
              <span className="text-blue-400">un partenaire qui assure.</span>
            </h2>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-start gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-white font-bold text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
