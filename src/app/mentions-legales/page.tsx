import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mentions légales' }

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Mentions légales</h1>
      <div className="prose prose-slate max-w-none">
        <h2>Éditeur du site</h2>
        <p><strong>Comink</strong><br />Rue de Bruxelles 174h<br />4340 Awans, Belgique<br />Tél : +32 4 233 01 38<br />Email : info@comink.be</p>
        <h2>Hébergement</h2>
        <p>Vercel Inc. · 340 Pine Street, Suite 701 · San Francisco, CA 94104 · États-Unis</p>
        <h2>Propriété intellectuelle</h2>
        <p>L'ensemble des contenus de ce site (textes, images, logos) est protégé par le droit d'auteur. Toute reproduction sans autorisation est interdite.</p>
        <h2>Données personnelles</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contact : info@comink.be</p>
      </div>
    </div>
  )
}
