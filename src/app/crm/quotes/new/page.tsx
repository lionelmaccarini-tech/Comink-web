import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QuoteEditor from '@/components/crm/QuoteEditor'

export default function NewQuotePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/crm/quotes" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux devis
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau devis</h1>
        <p className="text-slate-500 text-sm mt-0.5">Créez un devis pour un client</p>
      </div>
      <QuoteEditor />
    </div>
  )
}
