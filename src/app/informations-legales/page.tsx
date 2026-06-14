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
