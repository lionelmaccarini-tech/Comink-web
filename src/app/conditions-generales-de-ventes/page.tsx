import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Conditions générales de ventes — Comink',
  description: 'Conditions générales de ventes de Comink, imprimerie grand format à Liège.',
  robots: { index: true, follow: true },
}

const DEFAULT_CONTENT = `<h2>Conditions générales de ventes</h2>
<p>Comink fournit des services d'impression en ligne (web-print). L'inscription est requise en précisant le statut (professionnel ou particulier) et la nationalité.</p>`

export default async function CGVPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'legal_cgv')
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
