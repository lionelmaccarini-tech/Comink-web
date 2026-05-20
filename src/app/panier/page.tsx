import type { Metadata } from 'next'
import PanierClient from '@/components/panier/PanierClient'

export const metadata: Metadata = {
  title: 'Mon panier',
  description: 'Vérifiez vos articles et finalisez votre commande.',
}

export default function PanierPage() {
  return <PanierClient />
}
