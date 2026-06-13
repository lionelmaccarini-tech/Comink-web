import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'

const fallbackUseCases = [
  { slug: 'evenement',   name: 'Événement & salon',   icon: '🎪', description: 'Banderoles, roll-up, kakémonos pour vos événements' },
  { slug: 'chantier',    name: 'Chantier & BTP',       icon: '🏗️', description: 'Bâches, filets et palissades de chantier' },
  { slug: 'immobilier',  name: 'Immobilier',           icon: '🏠', description: 'Panneaux de vente, bâches de façade' },
  { slug: 'commerce',    name: 'Commerce & retail',    icon: '🛍️', description: 'Vitrophanie, PLV, banderoles promotionnelles' },
  { slug: 'restaurant',  name: 'Restaurant & horeca',  icon: '🍽️', description: 'Menus, terrasses, roll-up et affichage' },
  { slug: 'association', name: 'Association & sport',  icon: '⚽', description: 'Banderoles, panneaux publicitaires, drapeaux' },
]

const useCaseGradients: Record<string, string> = {
  evenement:   'linear-gradient(135deg, #00AEEF 0%, #0070A0 100%)',
  chantier:    'linear-gradient(135deg, #F5C400 0%, #B88B00 100%)',
  immobilier:  'linear-gradient(135deg, #09111f 0%, #1a2a40 100%)',
  commerce:    'linear-gradient(135deg, #E8001A 0%, #a00010 100%)',
  restaurant:  'linear-gradient(135deg, #E8001A 0%, #F5C400 100%)',
  association: 'linear-gradient(135deg, #00AEEF 0%, #E8001A 100%)',
}

const getUseCases = unstable_cache(
  async () => {
    try {
      const supabase = createPublicClient()
      const { data } = await supabase.from('use_cases').select('*').order('sort_order').limit(8)
      return data && data.length > 0 ? data : fallbackUseCases
    } catch {
      return fallbackUseCases
    }
  },
  ['use-cases'],
  { revalidate: 300 }
)

export default async function ToutPourSection() {
  const useCases = await getUseCases()

  return (
    <section className="bg-white py-20 border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid lg:grid-cols-[280px_1fr] gap-12 items-start">

          {/* Left: sticky label + CTA */}
          <div className="lg:sticky lg:top-8">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">VOUS ÊTES ?</p>
            <h2 className="text-3xl font-extrabold text-slate-900 leading-tight mb-4">
              On vous guide vers{' '}
              <span className="text-blue-600">la bonne solution.</span>
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Chaque projet est unique. Choisissez votre contexte, on vous propose les supports les plus adaptés.
            </p>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Voir toutes nos solutions <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {useCases.slice(0, 6).map((uc: any) => {
              const gradient = useCaseGradients[uc.slug] || useCaseGradients['evenement']
              return (
                <Link
                  key={uc.slug || uc.id}
                  href={`/catalogue?usecase=${uc.slug}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] flex flex-col items-center justify-center transition-opacity hover:opacity-90"
                  style={{ background: gradient }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-white" />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    {uc.icon && <span className="text-3xl drop-shadow-md">{uc.icon}</span>}
                    <p className="text-white font-bold text-sm leading-tight drop-shadow-md">
                      {uc.name}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
