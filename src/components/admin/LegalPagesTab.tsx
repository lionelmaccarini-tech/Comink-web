'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, ExternalLink } from 'lucide-react'
import RichTextEditor from './RichTextEditor'

const PAGES = [
  {
    key: 'legal_conditions_utilisation',
    title: "Conditions d'utilisation",
    slug: '/conditions-d-utilisation',
    defaultContent: `<h2>Conditions d'utilisation</h2>
<p>L'accès et l'utilisation du site www.comink.be impliquent l'acceptation pleine et entière des présentes conditions.</p>
<h2>Propriété intellectuelle</h2>
<p>Comink SRL, dont le siège social est établi rue de Bruxelles 175H à Awans (Belgique), numéro de TVA BE0535752576, enregistrée au RPM de Liège, est propriétaire de tous les contenus publiés sur ce site. Ces contenus sont protégés par les lois sur le droit d'auteur et la propriété intellectuelle.</p>
<p>Les utilisateurs peuvent uniquement télécharger ou imprimer des contenus à des fins personnelles et non commerciales. Toute distribution, modification ou réutilisation commerciale sans autorisation écrite préalable est strictement interdite.</p>
<h2>Exactitude des informations</h2>
<p>Comink s'engage à publier des informations exactes mais ne garantit pas l'exhaustivité ou l'exactitude des contenus de tiers. La société décline toute responsabilité pour les conséquences résultant de l'utilisation du site.</p>
<h2>Liens externes</h2>
<p>Comink n'est pas responsable des sites web externes. Les liens profonds et le cadrage (framing) sont interdits sans autorisation écrite. Les demandes de liens peuvent être envoyées à info@comink.be.</p>
<h2>Comptes utilisateurs</h2>
<p>Les utilisateurs enregistrés doivent fournir des informations exactes et à jour. Comink se réserve le droit de refuser l'accès ou de suspendre des comptes si les informations semblent incorrectes.</p>
<p><em>Dernière mise à jour : 1er juillet 2015</em></p>`,
  },
  {
    key: 'legal_cgv',
    title: 'Conditions générales de ventes',
    slug: '/conditions-generales-de-ventes',
    defaultContent: `<h2>1. Services proposés</h2>
<p>Comink fournit des services d'impression en ligne (web-print). L'inscription est requise en précisant le statut (professionnel ou particulier) et la nationalité. Les prix sont affichés en euros et peuvent varier. Les frais d'expédition sont ajoutés lors du paiement, sauf mention contraire dans l'offre.</p>
<h2>2. Sélection et achat de produits</h2>
<p>Les clients sélectionnent et personnalisent les produits en ajoutant les quantités à leur panier. Les images sont fournies à titre indicatif sans valeur contractuelle. Les clients sont seuls responsables de la vérification du contenu, de l'orthographe et des graphismes des fichiers importés.</p>
<h2>3. Paiement et téléchargement de fichiers</h2>
<p>Les modes de paiement acceptés sont les cartes de crédit, PayPal, Sofort et les virements bancaires. Le traitement commence uniquement après réception du paiement et du fichier. Pour les virements bancaires, l'impression est différée jusqu'à crédit du compte. Les factures sont disponibles dans l'espace client.</p>
<h3>3.2 Retard de paiement</h3>
<p>Les factures impayées génèrent automatiquement un intérêt mensuel de 1 %. Le non-paiement entraîne une pénalité de 10 % (minimum 100 €). Les retards de paiement peuvent conduire à une demande de paiement immédiat et à la suspension des commandes.</p>
<h2>4. Responsabilité du client pour le contenu</h2>
<p>Les clients assument l'entière responsabilité de la légalité du contenu et de l'acquisition des droits. Comink décline toute responsabilité pour l'utilisation non autorisée d'images ou les violations de propriété intellectuelle.</p>
<h2>5. Vérification automatique des fichiers</h2>
<p>Le système vérifie automatiquement le format, les dimensions, la résolution, les polices, les conversions de couleurs et les conversions PANTONE. Les fichiers non conformes sont bloqués.</p>
<h2>6. Délais de livraison</h2>
<p>La livraison commence après la confirmation de commande et le téléchargement du fichier (avant 22h00). Les fichiers non importés dans les 15 jours entraînent l'annulation de la commande et le remboursement. Comink n'accepte aucune responsabilité pour les retards de livraison.</p>
<h2>7. Assurance transport</h2>
<p>Les clients doivent inspecter les produits livrés immédiatement et signaler tout défaut au transporteur. L'option "Assurance Transport Comink" couvre la réimpression dans les 72 heures aux frais de Comink. Sans cette option, la convention CMR s'applique (environ 12,50 €/kg, plafonné à 125 €).</p>
<h2>8. Droit de rétractation</h2>
<p>Les entreprises ne bénéficient d'aucun droit de rétractation. Les particuliers peuvent se rétracter dans les 14 jours pour les produits non personnalisés uniquement. Les articles imprimés personnalisés ne peuvent pas être retournés. Les retours sont à la charge du client.</p>
<h2>9. Limitation de responsabilité</h2>
<p>Comink n'est pas responsable des erreurs d'impression sauf fraude ou négligence grave. Une réimpression est le seul recours possible. La correspondance parfaite des couleurs ne peut être garantie. Une tolérance de quantité de 10 % est acceptable.</p>
<h2>10. Protection des données</h2>
<p>Comink respecte le RGPD et la réglementation belge en matière de protection des données. Les informations collectées sont utilisées pour la gestion des comptes, la prestation de services et la conformité légale. Les clients peuvent accéder à leurs données, les corriger ou demander leur suppression. Contact Commission Vie Privée : 02/274 48 00.</p>
<h2>11. Droit applicable</h2>
<p>Le droit belge régit ces conditions. Les litiges relèvent de la compétence exclusive des tribunaux de Liège.</p>`,
  },
  {
    key: 'legal_informations_legales',
    title: 'Informations légales',
    slug: '/informations-legales',
    defaultContent: `<h2>Informations légales</h2>
<h3>Identité de l'entreprise</h3>
<p><strong>Comink SRL</strong><br/>
Rue de Bruxelles 174H<br/>
4340 Awans (Liège), Belgique</p>
<p>Téléphone : <a href="tel:+3242330138">+32 4 233 01 38</a><br/>
Email : <a href="mailto:info@comink.be">info@comink.be</a></p>
<p>Numéro de TVA : BE0535 752 576<br/>
Administrateurs : Gilles Longtain et Nicolas Delweye</p>
<h3>Conception du site</h3>
<p>Design : Raspberry Design SPRL</p>
<h3>Hébergement</h3>
<p>Ce site est hébergé par Vercel Inc., 340 Pine Street, Suite 701, San Francisco, California 94104, USA.</p>
<h3>Propriété intellectuelle</h3>
<p>L'ensemble des contenus présents sur ce site (textes, images, logos, vidéos) sont la propriété exclusive de Comink SRL ou de ses partenaires. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>`,
  },
  {
    key: 'legal_paiement_securise',
    title: 'Paiement sécurisé',
    slug: '/paiement-securise',
    defaultContent: `<h2>Paiement sécurisé</h2>
<p>Comink vous garantit des transactions entièrement sécurisées grâce à plusieurs méthodes de paiement éprouvées.</p>
<h2>Notre prestataire de paiement : Stripe</h2>
<p>Le site utilise <strong>Stripe</strong> pour la sécurisation des transactions. Stripe assure la sécurisation complète de chaque paiement. Vos données bancaires sensibles sont traitées exclusivement par Stripe et ne transitent jamais par nos serveurs, vous garantissant une protection optimale.</p>
<h2>Modes de paiement acceptés</h2>
<p>Nous acceptons les modes de paiement suivants :</p>
<ul>
  <li>Carte de crédit / débit (Visa, Mastercard)</li>
  <li>PayPal</li>
  <li>Sofort</li>
  <li>Virement bancaire</li>
</ul>
<h2>Conditions de paiement</h2>
<p>Des conditions de paiement spécifiques peuvent être accordées sur demande écrite. La production commence uniquement après réception du paiement et du fichier d'impression.</p>
<h2>Sécurité de vos données</h2>
<p>Toutes les communications entre votre navigateur et notre site sont chiffrées via le protocole SSL/TLS. Aucune information bancaire n'est stockée sur nos serveurs.</p>`,
  },
]

export default function LegalPagesTab() {
  const [contents, setContents] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const init: Record<string, string> = {}
        for (const p of PAGES) {
          init[p.key] = d?.[p.key] ?? p.defaultContent
        }
        setContents(init)
      })
      .catch(() => {
        const init: Record<string, string> = {}
        for (const p of PAGES) init[p.key] = p.defaultContent
        setContents(init)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(key: string) {
    setSaving(key)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: contents[key] ?? '' }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 2500)
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        Ces pages sont accessibles publiquement. Le contenu est enregistré dans les paramètres du site.
      </div>

      {PAGES.map(page => (
        <div key={page.key} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">{page.title}</h3>
              <a
                href={page.slug}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
              >
                <ExternalLink className="w-3 h-3" />
                {page.slug}
              </a>
            </div>
            <button
              onClick={() => handleSave(page.key)}
              disabled={saving === page.key}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {saving === page.key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved === page.key ? (
                '✓ Enregistré'
              ) : (
                <><Save className="w-4 h-4" /> Enregistrer</>
              )}
            </button>
          </div>
          <RichTextEditor
            value={contents[page.key] ?? ''}
            onChange={html => setContents(prev => ({ ...prev, [page.key]: html }))}
            placeholder={`Contenu de la page "${page.title}"…`}
          />
        </div>
      ))}
    </div>
  )
}
