import type { Metadata } from 'next'
import FileCheckerWrapper from '@/components/public/FileCheckerWrapper'

export const metadata: Metadata = {
  title: 'Vérifier mon fichier — Comink',
  description: "Vérifiez la conformité de votre fichier d'impression avant de commander. Analyse IA instantanée : résolution, mode colorimétrique, fond perdu...",
}

export default function VerifierFichierPage() {
  return <FileCheckerWrapper />
}
