'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ShoppingCart, ChevronDown, User, Phone, Settings, LayoutDashboard, LogOut, Users, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface NavProduct {
  id: string
  name: string
  category: string
  product_type: 'sur_mesure' | 'taille_standard'
}

const CATEGORY_LABELS: Record<string, string> = {
  banderoles: 'Banderoles', roll_up: 'Roll-up', drapeaux: 'Drapeaux',
  adhesifs: 'Adhésifs', toiles: 'Toiles', baches: 'Bâches',
  panneaux: 'Panneaux', textile: 'Textile', papier: 'Papier',
  accessoires: 'Accessoires', supports_evenementiels: 'Supports évènementiels',
  vinyle_autocollant: 'Vinyle autocollant', autre: 'Autre',
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [userProfile, setUserProfile] = useState<{ email: string; full_name?: string; role: string } | null>(null)
  const catalogRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMobileOpen(false)
    setCatalogOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) setCatalogOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load user profile
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data: profile } = await supabase.from('profiles').select('email, full_name, role').eq('id', session.user.id).single()
      if (profile) setUserProfile(profile)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserProfile(null)
    setUserMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const isAdmin = userProfile?.role === 'admin'
  const isStaff = userProfile && ['admin', 'collaborateur', 'producteur'].includes(userProfile.role)

  // Cart count from localStorage
  useEffect(() => {
    const updateCount = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('comink_cart') || '{}')
        const items: any[] = stored.state?.items ?? []
        const count = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)
        setCartCount(count)
      } catch { setCartCount(0) }
    }
    updateCount()
    window.addEventListener('storage', updateCount)
    window.addEventListener('cart-updated', updateCount)
    return () => {
      window.removeEventListener('storage', updateCount)
      window.removeEventListener('cart-updated', updateCount)
    }
  }, [])

  const surMesureCategories = ['banderoles', 'baches', 'toiles', 'adhesifs', 'drapeaux', 'panneaux', 'vinyle_autocollant']
  const tailleStandardCategories = ['roll_up', 'textile', 'accessoires']

  // Masquer le header site sur les pages back-office
  const BACKOFFICE = ['/admin', '/production', '/crm']
  if (BACKOFFICE.some(p => pathname.startsWith(p))) return null

  return (
    <header className="bg-sky-950 sticky top-0 z-50 shadow-sm border-b border-sky-900">
      {/* Topbar urgence */}
      <div className="bg-blue-600 text-white text-xs text-center py-1.5 px-4">
        <span className="hidden sm:inline">⚡ Projet urgent ? Devis en moins de 2h — </span>
        <a href="tel:+3242330138" suppressHydrationWarning className="font-bold hover:underline">+32 4 233 01 38</a>
        <span className="mx-2">·</span>
        <a href="mailto:info@comink.be" className="hover:underline">info@comink.be</a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
              alt="Comink"
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/" className={cn('text-sm font-semibold transition-colors', pathname === '/' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Accueil
            </Link>

            {/* Produits dropdown */}
            <div className="relative" ref={catalogRef}>
              <button
                onClick={() => setCatalogOpen((o) => !o)}
                className="text-slate-300 hover:text-white text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                Nos produits
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', catalogOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {catalogOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                  >
                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                      <div className="py-2">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sur mesure</p>
                        {surMesureCategories.map((cat) => (
                          <Link key={cat} href={`/catalogue?type=sur_mesure&category=${cat}`}
                            className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            {CATEGORY_LABELS[cat] || cat}
                          </Link>
                        ))}
                      </div>
                      <div className="py-2">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taille standard</p>
                        {tailleStandardCategories.map((cat) => (
                          <Link key={cat} href={`/catalogue?type=taille_standard&category=${cat}`}
                            className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            {CATEGORY_LABELS[cat] || cat}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                      <Link href="/catalogue" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Voir tous les produits →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/commande-rapide"
              className={cn('flex items-center gap-1.5 text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg',
                pathname === '/commande-rapide'
                  ? 'bg-blue-600 text-white'
                  : 'text-yellow-300 hover:text-white hover:bg-white/10 border border-yellow-400/30')}>
              <Zap className="w-3.5 h-3.5" /> Commande rapide
            </Link>

            <Link href="/devis" className={cn('text-sm font-semibold transition-colors', pathname === '/devis' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Devis
            </Link>
            <Link href="/blog" className={cn('text-sm font-semibold transition-colors', pathname === '/blog' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Blog
            </Link>
            <Link href="/contact" className={cn('text-sm font-semibold transition-colors', pathname === '/contact' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Contact
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/panier" className="relative p-1">
              <ShoppingCart className="text-slate-300 w-5 h-5 hover:text-white transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="hidden md:block relative" ref={userMenuRef}>
              {userProfile ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className={cn(
                      'flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors',
                      isAdmin ? 'bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:bg-blue-600/30' : 'text-slate-300 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', isAdmin ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200')}>
                      {(userProfile.full_name || userProfile.email)[0].toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate">{userProfile.full_name || userProfile.email.split('@')[0]}</span>
                    {isAdmin && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                    <ChevronDown className={cn('w-3 h-3 transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                          <p className="text-xs font-bold text-slate-800 truncate">{userProfile.full_name || '—'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{userProfile.email}</p>
                        </div>

                        <div className="py-1">
                          <Link href="/compte" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                            <User className="w-4 h-4 text-slate-400" /> Mon compte
                          </Link>

                          {isStaff && (
                            <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                              <LayoutDashboard className="w-4 h-4 text-slate-400" /> Administration
                            </Link>
                          )}

                          {isAdmin && (
                            <>
                              <Link href="/admin?tab=clients" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                <Users className="w-4 h-4 text-slate-400" /> Gestion clients
                              </Link>
                              <Link href="/admin?tab=parametres" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                <Settings className="w-4 h-4 text-slate-400" /> Paramètres
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="border-t border-slate-100 py-1">
                          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" /> Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link href="/auth/login" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-xs font-medium">
                  <User className="w-4 h-4" /> Se connecter
                </Link>
              )}
            </div>


            <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-sky-900 overflow-hidden bg-sky-950"
          >
            <nav className="px-4 py-4 space-y-1">
              <Link href="/" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Accueil</Link>
              <div className="py-2 border-b border-sky-900">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sur mesure</p>
                {surMesureCategories.map((cat) => (
                  <Link key={cat} href={`/catalogue?type=sur_mesure&category=${cat}`}
                    className="block text-sm py-1.5 pl-3 text-slate-300">{CATEGORY_LABELS[cat]}</Link>
                ))}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-2">Taille standard</p>
                {tailleStandardCategories.map((cat) => (
                  <Link key={cat} href={`/catalogue?type=taille_standard&category=${cat}`}
                    className="block text-sm py-1.5 pl-3 text-slate-300">{CATEGORY_LABELS[cat]}</Link>
                ))}
                <Link href="/catalogue" className="block text-sm font-bold py-2 pl-3 text-blue-400">Tous les produits →</Link>
              </div>
              <Link href="/commande-rapide" className="flex items-center gap-2 text-sm font-semibold py-2.5 text-yellow-300 border-b border-sky-900">
                <Zap className="w-3.5 h-3.5" /> Commande rapide
              </Link>
              <Link href="/devis" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Devis</Link>
              <Link href="/blog" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Blog</Link>
              <Link href="/contact" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Contact</Link>
              {userProfile ? (
                <>
                  <div className="py-2 border-b border-sky-900">
                    <p className="text-xs text-slate-400">{userProfile.email}</p>
                  </div>
                  <Link href="/compte" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Mon compte</Link>
                  {isStaff && <Link href="/admin" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Administration</Link>}
                  {isAdmin && <Link href="/admin?tab=parametres" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Paramètres</Link>}
                  <button onClick={handleLogout} className="block w-full text-left text-sm font-semibold py-2.5 text-red-400 border-b border-sky-900">Déconnexion</button>
                </>
              ) : (
                <Link href="/auth/login" className="block text-sm font-semibold py-2.5 text-slate-200 border-b border-sky-900">Se connecter</Link>
              )}
              <Link href="/catalogue" className="block bg-blue-600 text-white font-bold text-sm text-center py-3 rounded-lg mt-3">
                Commander maintenant
              </Link>
              <a href="tel:+3242330138" suppressHydrationWarning className="flex items-center gap-2 text-slate-300 text-sm py-2">
                <Phone className="w-4 h-4" /> +32 4 233 01 38
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
