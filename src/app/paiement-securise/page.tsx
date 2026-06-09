import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Paiement sécurisé — Comink',
  description: 'Informations sur le paiement sécurisé chez Comink. Stripe, carte bancaire, PayPal, virement.',
  robots: { index: true, follow: true },
}

const DEFAULT_CONTENT = `<h2>Paiement sécurisé</h2>
<p>Comink vous garantit des transactions entièrement sécurisées grâce à Stripe. Vos données bancaires ne transitent jamais par nos serveurs.</p>`

export default async function PaiementSecurisePage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'legal_paiement_securise')
    .single()

  const html = data?.value || DEFAULT_CONTENT

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  )
}
