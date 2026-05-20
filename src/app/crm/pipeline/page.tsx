import PipelineBoard from '@/components/crm/PipelineBoard'

export default function PipelinePage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="text-slate-500 text-sm mt-0.5">Visualisez et faites avancer vos opportunités</p>
      </div>
      <PipelineBoard />
    </div>
  )
}
