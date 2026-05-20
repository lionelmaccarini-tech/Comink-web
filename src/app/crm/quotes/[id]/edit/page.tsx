import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QuoteEditorLoader from '@/components/crm/QuoteEditorLoader'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/crm/quotes/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour au devis
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Modifier le devis</h1>
      </div>
      <QuoteEditorLoader quoteId={id} />
    </div>
  )
}
