import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Politique de confidentialité' }

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Politique de confidentialité</h1>
      <div className="prose prose-slate max-w-none">
        <h2>Données collectées</h2>
        <p>Nous collectons les données que vous nous fournissez lors de vos commandes et demandes de devis : nom, email, téléphone, adresse de livraison.</p>
        <h2>Utilisation</h2>
        <p>Ces données sont utilisées exclusivement pour traiter vos commandes, vous envoyer des confirmations et améliorer nos services.</p>
        <h2>Partage</h2>
        <p>Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec Stripe (paiement) et Resend (emails transactionnels) dans le seul but d'exécuter votre commande.</p>
        <h2>Conservation</h2>
        <p>Vos données sont conservées 5 ans à compter de la dernière transaction, conformément aux obligations légales belges.</p>
        <h2>Vos droits</h2>
        <p>Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à info@comink.be.</p>
        <h2>Cookies</h2>
        <p>Ce site utilise des cookies techniques nécessaires au fonctionnement (panier, session). Aucun cookie publicitaire n'est utilisé.</p>
      </div>
    </div>
  )
}
