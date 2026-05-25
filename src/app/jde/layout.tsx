import type { Metadata } from 'next'
import JDENav from '@/components/jde/JDENav'
import { JDEProvider } from '@/components/jde/JDEContext'

export const metadata: Metadata = {
  title: 'Print My JDE',
  description: 'Votre plateforme de commande Journée Découverte Entreprise',
}

// Pas de <html><body> ici — le root layout les fournit.
// Le root layout détecte /jde et masque le shell Comink automatiquement.
export default function JDELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <JDEProvider>
        <JDENav />
        <main>{children}</main>
      </JDEProvider>
    </div>
  )
}
