import BackOfficeNav from '@/components/layout/BackOfficeNav'
import CrmNav from '@/components/crm/CrmNav'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <BackOfficeNav />
      <CrmNav />
      <div className="flex-1">{children}</div>
    </div>
  )
}
