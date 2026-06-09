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
