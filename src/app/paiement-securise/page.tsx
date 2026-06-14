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
    <main className="min-h-screen" style={{ background: '#09111f' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div
          className="rounded-xl px-8 py-10"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="prose max-w-none
              prose-headings:text-[#00AEEF] prose-headings:font-bold
              prose-p:text-slate-300
              prose-strong:text-white
              prose-a:text-[#00AEEF] prose-a:no-underline hover:prose-a:underline
              prose-ul:text-slate-300 prose-ol:text-slate-300
              prose-li:text-slate-300
              prose-hr:border-white/10"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </main>
  )
}
