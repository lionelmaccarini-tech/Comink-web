import type { Metadata } from 'next'
import DevisForm from '@/components/devis/DevisForm'

export const metadata: Metadata = {
  title: 'Demander un devis',
  description: 'Obtenez un devis personnalisé pour votre projet d\'impression grand format. Réponse en moins de 2h.',
}

export default function DevisPage() {
  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      {/* Hero */}
      <div className="text-white relative overflow-hidden" style={{ background: '#071525' }}>
        {/* Ligne CMYK */}
        <div className="absolute top-0 left-0 right-0 h-[3px] flex">
          <div className="flex-1" style={{ background: '#00AEEF' }} />
          <div className="flex-1" style={{ background: '#E8001A' }} />
          <div className="flex-1" style={{ background: '#F5C400' }} />
        </div>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: '#00AEEF' }}>◆ DEVIS GRATUIT</p>
          <h1 className="text-3xl md:text-4xl font-black text-white">Demandez votre devis</h1>
          <div className="h-[3px] rounded-full mt-4 w-12 mx-auto" style={{ background: '#F5C400' }} />
          <p className="mt-3 font-semibold text-slate-300">Décrivez votre projet, on s'occupe du reste.</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <DevisForm />
      </div>
    </div>
  )
}
