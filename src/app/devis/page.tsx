import type { Metadata } from 'next'
import DevisForm from '@/components/devis/DevisForm'

export const metadata: Metadata = {
  title: 'Demander un devis',
  description: 'Obtenez un devis personnalisé pour votre projet d\'impression grand format. Réponse en moins de 2h.',
}

export default function DevisPage() {
  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">DEVIS GRATUIT</p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Demandez votre devis</h1>
          <p className="text-slate-400 mt-2">Réponse personnalisée en moins de 2h ouvrables.</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <DevisForm />
      </div>
    </div>
  )
}
