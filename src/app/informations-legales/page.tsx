import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Informations légales — Comink',
  description: 'Informations légales et mentions légales de Comink SRL, imprimerie grand format à Liège.',
  robots: { index: true, follow: true },
}

const DEFAULT_CONTENT = `<h2>Informations légales</h2>
<p><strong>Comink SRL</strong><br/>Rue de Bruxelles 174H, 4340 Awans (Liège), Belgique<br/>Téléphone : +32 4 233 01 38<br/>Email : info@comink.be<br/>TVA : BE0535 752 576</p>`

export default async function InformationsLegalesPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'legal_informations_legales')
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
