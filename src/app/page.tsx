import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import MarqueeStrip from '@/components/home/MarqueeStrip'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import CtaFinalSection from '@/components/home/CtaFinalSection'

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Marquee — ticker produits */}
      <MarqueeStrip />

      {/* 3. Produits phares */}
      <Suspense fallback={<div className="bg-slate-50 py-20 animate-pulse" />}>
        <FeaturedCategories />
      </Suspense>

      {/* 4. Témoignages */}
      <TestimonialsSection />

      {/* 5. CTA final */}
      <CtaFinalSection />
    </>
  )
}
