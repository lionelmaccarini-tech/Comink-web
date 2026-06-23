'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, KanbanSquare, FileText, Users, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/crm',           label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { href: '/crm/pipeline',  label: 'Pipeline',   icon: KanbanSquare },
  { href: '/crm/quotes',    label: 'Devis',      icon: FileText },
  { href: '/crm/clients',   label: 'Clients',    icon: Users },
  { href: '/crm/analytics', label: 'Analytics',  icon: BarChart2 },
]

export default function CrmNav() {
  const pathname = usePathname()
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors',
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
