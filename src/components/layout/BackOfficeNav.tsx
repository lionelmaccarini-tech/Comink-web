'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Cog, Users, LogOut, ExternalLink, ChevronDown, Wrench, TrendingUp, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Production',
    href: '/production',
    icon: <Wrench className="w-4 h-4" />,
    roles: ['admin', 'collaborateur', 'producteur'],
  },
  {
    label: 'Administration',
    href: '/admin',
    icon: <Cog className="w-4 h-4" />,
    roles: ['admin', 'collaborateur'],
  },
  {
    label: 'CRM',
    href: '/crm',
    icon: <TrendingUp className="w-4 h-4" />,
    roles: ['admin', 'collaborateur', 'vendeur'],
  },
]

export default function BackOfficeNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      setUserInfo({
        name: data?.full_name || user.email?.split('@')[0] || 'Utilisateur',
        email: user.email || '',
        role: data?.role || 'collaborateur',
      })
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const visibleItems = userInfo
    ? NAV_ITEMS.filter(item => item.roles.includes(userInfo.role))
    : []

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    collaborateur: 'Collaborateur',
    producteur: 'Production',
    vendeur: 'Vendeur',
    client: 'Client',
  }

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 sticky top-0 z-50 flex-shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
        <img
          src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
          alt="Comink"
          className="h-7 brightness-0 invert"
        />
      </Link>

      {/* Séparateur */}
      <div className="h-6 w-px bg-slate-700 flex-shrink-0" />

      {/* Navigation */}
      <nav className="flex items-center gap-1 flex-1">
        {visibleItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${isActive
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Actions droite */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Lien retour au site */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Voir le site</span>
        </Link>

        {/* User menu */}
        {userInfo && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInfo.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-semibold text-white">{userInfo.name}</span>
                <span className="text-[10px] text-slate-400">{roleLabel[userInfo.role] ?? userInfo.role}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-xs font-semibold text-white truncate">{userInfo.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{userInfo.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
