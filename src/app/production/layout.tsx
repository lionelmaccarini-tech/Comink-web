import BackOfficeNav from '@/components/layout/BackOfficeNav'

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <BackOfficeNav />
      <div className="flex-1">{children}</div>
    </div>
  )
}
