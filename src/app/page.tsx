import { Suspense } from 'react'
import type { Metadata } from 'next'
import HeroSection from '@/components/home/HeroSection'
import Section3D from '@/components/home/Section3D'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import WhyUsSection from '@/components/home/WhyUsSection'
import CtaFinalSection from '@/components/home/CtaFinalSection'
import LocalBusinessSchema from '@/components/seo/LocalBusinessSchema'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

export const metadata: Metadata = {
  title: 'Comink — Imprimerie Grand Format à Liège | Bâches, Banderoles, Roll-up',
  description:
    'Imprimerie grand format professionnelle à Liège (Awans). Commandez en ligne vos bâches PVC, banderoles, roll-ups, adhésifs, panneaux, dépliants et plus. Devis gratuit en 2h, production rapide, livraison en Belgique.',
  keywords: [
    'imprimerie grand format Liège',
    'imprimerie Liège',
    'bâche PVC Liège',
    'banderole impression Belgique',
    'roll-up stand Liège',
    'adhésif vitrophanie',
    'panneau forex impression',
    'impression rapide Liège',
    'Comink imprimerie',
    'Awans imprimerie',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    siteName: 'Comink',
    url: SITE_URL,
    title: 'Comink — Imprimerie Grand Format à Liège',
    description:
      'Bâches, banderoles, roll-ups, adhésifs et plus. Commande en ligne, devis en 2h, production locale à Liège.',
    images: [
      {
        url: 'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/ec5cf922b_IMG_0629.jpg',
        width: 1200,
        height: 630,
        alt: 'Comink Imprimerie Grand Format Liège',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comink — Imprimerie Grand Format à Liège',
    description: 'Bâches, banderoles, roll-ups, adhésifs. Commande en ligne, devis en 2h.',
    images: ['https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/ec5cf922b_IMG_0629.jpg'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: { index: true, follow: true },
}

export default function HomePage() {
  return (
    <>
      <LocalBusinessSchema />

      {/* 1. Hero — Three.js + marquee */}
      <HeroSection />

      {/* 2. Produits phares */}
      <Section3D delay={0.1}>
        <Suspense fallback={<div className="py-24 animate-pulse" style={{ background: '#09111f' }} />}>
          <FeaturedCategories />
        </Suspense>
      </Section3D>

      {/* 3. Pourquoi Comink */}
      <Section3D delay={0.12}>
        <WhyUsSection />
      </Section3D>

      {/* 4. CTA final */}
      <Section3D delay={0.15}>
        <CtaFinalSection />
      </Section3D>
    </>
  )
}
