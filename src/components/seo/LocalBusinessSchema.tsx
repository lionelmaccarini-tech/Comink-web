/**
 * Structured data JSON-LD LocalBusiness pour Comink.
 * Inséré dans la homepage pour améliorer le référencement local Google.
 */
export default function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://comink.be/#business',
    name: 'Comink',
    description:
      'Imprimerie grand format professionnelle à Liège. Bâches PVC, banderoles, roll-ups, adhésifs, panneaux et impression numérique. Devis en 2h, production rapide.',
    url: 'https://comink.be',
    telephone: '+3242330138',
    email: 'info@comink.be',
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Virement bancaire, Carte bancaire, Stripe, Alma',
    image: 'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/ec5cf922b_IMG_0629.jpg',
    logo: 'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue de Bruxelles 174h',
      addressLocality: 'Awans',
      postalCode: '4340',
      addressCountry: 'BE',
      addressRegion: 'Liège',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 50.6884,
      longitude: 5.4498,
    },
    areaServed: [
      { '@type': 'City', name: 'Liège' },
      { '@type': 'City', name: 'Awans' },
      { '@type': 'Country', name: 'Belgique' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Produits impression grand format',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bâche PVC' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Banderole' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Roll-up' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Adhésif vitrophanie' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Panneau forex' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Kakémono' } },
      ],
    },
    sameAs: [
      'https://comink.be',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
