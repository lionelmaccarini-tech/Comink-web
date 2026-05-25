import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import ChiffresSection from '@/components/home/ChiffresSection'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import ToutPourSection from '@/components/home/ToutPourSection'
import WhyUsSection from '@/components/home/WhyUsSection'
import UrgenceSection from '@/components/home/UrgenceSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import AngeloSection from '@/components/home/AngeloSection'
import CtaFinalSection from '@/components/home/CtaFinalSection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ChiffresSection />
      <Suspense fallback={<div className="bg-blue-100 py-16 animate-pulse" />}>
        <FeaturedCategories />
      </Suspense>
      <Suspense fallback={<div className="bg-blue-100 py-16 animate-pulse" />}>
        <ToutPourSection />
      </Suspense>
      <WhyUsSection />
      <UrgenceSection />
      <TestimonialsSection />
      <AngeloSection />
      <CtaFinalSection />
    </>
  )
}
