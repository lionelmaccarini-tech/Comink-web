import CrmDashboard from '@/components/crm/CrmDashboard'

export default function CrmPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vue d'ensemble du pipeline commercial</p>
        </div>
      </div>
      <CrmDashboard />
    </div>
  )
}
