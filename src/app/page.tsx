import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import CtaFinalSection from '@/components/home/CtaFinalSection'

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — contient stats bar + marquee, tout tient en un écran */}
      <HeroSection />

      {/* 2. Produits phares */}
      <Suspense fallback={<div className="bg-slate-50 py-20 animate-pulse" />}>
        <FeaturedCategories />
      </Suspense>

      {/* 3. CTA final */}
      <CtaFinalSection />
    </>
  )
}
