import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Comink",
  description: "Conditions d'utilisation du site web Comink, imprimerie grand format à Liège.",
  robots: { index: true, follow: true },
}

const DEFAULT_CONTENT = `<h2>Conditions d'utilisation</h2>
<p>L'accès et l'utilisation du site www.comink.be impliquent l'acceptation pleine et entière des présentes conditions.</p>
<p>Comink SRL, dont le siège social est établi rue de Bruxelles 175H à Awans (Belgique), numéro de TVA BE0535752576, est propriétaire de tous les contenus publiés sur ce site.</p>`

export default async function ConditionsUtilisationPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'legal_conditions_utilisation')
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
