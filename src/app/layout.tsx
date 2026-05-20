import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/toaster'
import { createServiceClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'

async function getSeoSettings() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase.from('app_settings').select('key, value')
    if (!data) return {}
    return Object.fromEntries(data.map((r: any) => [r.key, r.value]))
  } catch {
    return {}
  }
}

export const metadata: Metadata = {
  title: {
    default: 'Comink — Imprimerie Grand Format à Liège',
    template: '%s | Comink',
  },
  description: "Impression grand format professionnelle à Liège. Banderoles, bâches, roll-up, adhésifs et plus. Commande en ligne rapide, devis en 2h, production locale.",
  keywords: ['imprimerie', 'grand format', 'Liège', 'banderole', 'bâche', 'roll-up', 'impression professionnelle', 'Belgique'],
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    siteName: 'Comink',
    title: 'Comink — Imprimerie Grand Format à Liège',
    description: "Impression grand format professionnelle. Rapide, fiable, 100% local.",
    images: [{ url: 'https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/ec5cf922b_IMG_0629.jpg', width: 1200, height: 630, alt: 'Comink Imprimerie' }],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(SITE_URL),
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seo = await getSeoSettings()
  const gaId   = seo.seo_ga_id   as string | undefined
  const gscCode = seo.seo_gsc_code as string | undefined

  return (
    <html lang="fr" className={inter.variable}>
      <head>
        {/* Google Search Console verification */}
        {gscCode && <meta name="google-site-verification" content={gscCode} />}
      </head>
      <body className="min-h-screen bg-sky-50 flex flex-col antialiased">
        <Toaster>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Toaster>

        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { page_path: window.location.pathname });
            `}</Script>
          </>
        )}
      </body>
    </html>
  )
}
