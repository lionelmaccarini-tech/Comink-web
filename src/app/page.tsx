import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import Section3D from '@/components/home/Section3D'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import CtaFinalSection from '@/components/home/CtaFinalSection'

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — Three.js + marquee */}
      <HeroSection />

      {/* 2. Produits phares */}
      <Section3D delay={0.1}>
        <Suspense fallback={<div className="bg-[#f0f9ff] py-24 animate-pulse" />}>
          <FeaturedCategories />
        </Suspense>
      </Section3D>

      {/* 3. CTA final */}
      <Section3D delay={0.15}>
        <CtaFinalSection />
      </Section3D>
    </>
  )
}
