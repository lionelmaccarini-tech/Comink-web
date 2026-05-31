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

const useCaseImages: Record<string, string> = {
  evenement:   'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80',
  chantier:    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
  immobilier:  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
  commerce:    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
  restaurant:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
  association: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
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
              const img = useCaseImages[uc.slug] || useCaseImages['evenement']
              return (
                <Link
                  key={uc.slug || uc.id}
                  href={`/catalogue?usecase=${uc.slug}`}
                  className="group relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3]"
                >
                  <img
                    src={img}
                    alt={uc.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {uc.icon && <span className="text-lg mb-0.5 block">{uc.icon}</span>}
                    <p className="text-white font-bold text-sm leading-tight group-hover:text-blue-300 transition-colors">
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
