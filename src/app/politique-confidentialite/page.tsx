import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Politique de confidentialité' }

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h1 className="text-3xl font-extrabold text-white mb-8">Politique de confidentialité</h1>
        <div
          className="rounded-xl px-8 py-10"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="prose max-w-none
            prose-headings:text-[#00AEEF] prose-headings:font-bold
            prose-p:text-slate-300
            prose-strong:text-white
            prose-a:text-[#00AEEF] prose-a:no-underline hover:prose-a:underline
            prose-ul:text-slate-300 prose-ol:text-slate-300
            prose-li:text-slate-300
            prose-hr:border-white/10">
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
      </div>
    </div>
  )
}
