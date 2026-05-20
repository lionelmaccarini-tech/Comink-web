import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QuoteDetail from '@/components/crm/QuoteDetail'

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sent?: string }>
}) {
  const { id }   = await params
  const { sent } = await searchParams

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/crm/quotes" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux devis
        </Link>
      </div>
      <QuoteDetail quoteId={id} showSentBanner={sent === '1'} />
    </div>
  )
}
