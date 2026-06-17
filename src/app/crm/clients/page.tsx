import ClientsTab from '@/components/admin/ClientsTab'

export default function CrmClientsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gérez vos comptes clients et leurs membres</p>
      </div>
      <ClientsTab />
    </div>
  )
}
