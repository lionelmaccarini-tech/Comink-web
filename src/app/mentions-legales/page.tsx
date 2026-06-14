import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mentions légales' }

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen" style={{ background: '#09111f' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h1 className="text-3xl font-extrabold text-white mb-8">Mentions légales</h1>
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
      </div>
    </div>
  )
}
