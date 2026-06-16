'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ShoppingCart, ChevronDown, User, Phone, Settings, LayoutDashboard, LogOut, Users, Zap, Factory, Package, FileText, Receipt, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#060e1f' }

interface NavCategory {
  id: string
  label: string
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [userProfile, setUserProfile] = useState<{ email: string; full_name?: string; role: string } | null>(null)
  const [navCats, setNavCats] = useState<{ sur_mesure: NavCategory[]; taille_standard: NavCategory[] }>({ sur_mesure: [], taille_standard: [] })
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

  useEffect(() => {
    fetch('/api/products/nav-categories')
      .then(r => r.json())
      .then(d => { if (d.sur_mesure) setNavCats(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase.from('profiles').select('email, full_name, role').eq('id', userId).single()
      if (profile) setUserProfile(profile)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
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

  const BACKOFFICE = ['/admin', '/production', '/crm']
  if (BACKOFFICE.some(p => pathname.startsWith(p))) return null

  return (
    <header className="sticky top-0 z-50" style={{ background: C.navy }}>
      {/* Topbar cyan */}
      <div className="text-white text-xs text-center py-1.5 px-4 font-medium" style={{ background: C.cyan }}>
        <span className="hidden sm:inline text-white/90">Imprimerie grand format à Liège — </span>
        <a href="tel:+3242330138" suppressHydrationWarning className="font-black hover:underline">+32 4 233 01 38</a>
        <span className="mx-2 opacity-60">·</span>
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
            <Link href="/"
              className={cn('text-sm font-semibold transition-colors', pathname === '/' ? 'text-white' : 'text-slate-300 hover:text-white')}>
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
                    className="absolute top-full left-0 mt-3 w-72 rounded-xl shadow-2xl overflow-hidden z-50"
                    style={{ background: '#0d1f38', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {/* CMYK line */}
                    <div className="h-[3px] flex">
                      <div className="flex-1" style={{ background: C.cyan }} />
                      <div className="flex-1" style={{ background: C.magenta }} />
                      <div className="flex-1" style={{ background: C.yellow }} />
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-white/[0.07]">
                      {navCats.sur_mesure.length > 0 && (
                        <div className="py-2">
                          <Link href="/catalogue?type=sur_mesure" onClick={() => setCatalogOpen(false)}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            style={{ color: C.cyan }}>
                            Sur mesure →
                          </Link>
                          {navCats.sur_mesure.map((cat) => (
                            <Link key={cat.id} href={`/catalogue?type=sur_mesure&category=${cat.id}`}
                              onClick={() => setCatalogOpen(false)}
                              className="flex items-center px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors">
                              {cat.label}
                            </Link>
                          ))}
                        </div>
                      )}
                      {navCats.taille_standard.length > 0 && (
                        <div className="py-2">
                          <Link href="/catalogue?type=taille_standard" onClick={() => setCatalogOpen(false)}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            style={{ color: C.magenta }}>
                            Taille standard →
                          </Link>
                          {navCats.taille_standard.map((cat) => (
                            <Link key={cat.id} href={`/catalogue?type=taille_standard&category=${cat.id}`}
                              onClick={() => setCatalogOpen(false)}
                              className="flex items-center px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors">
                              {cat.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                      <Link href="/catalogue" className="text-sm font-black flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ color: C.yellow }}>
                        Voir tous les produits →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/commande-rapide"
              className={cn('flex items-center gap-1.5 text-sm font-black transition-all px-3 py-1.5 rounded-lg',
                pathname === '/commande-rapide'
                  ? 'text-slate-900'
                  : 'hover:opacity-90')}
              style={pathname === '/commande-rapide'
                ? { background: C.yellow }
                : { color: C.yellow, border: `1px solid ${C.yellow}40`, background: `${C.yellow}10` }}>
              <Zap className="w-3.5 h-3.5" /> Commande rapide
            </Link>

            <Link href="/devis"
              className={cn('text-sm font-semibold transition-colors', pathname === '/devis' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Devis
            </Link>
            <Link href="/verifier-fichier"
              className={cn('text-sm font-semibold transition-colors', pathname === '/verifier-fichier' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Vérifier mon fichier
            </Link>
            <Link href="/blog"
              className={cn('text-sm font-semibold transition-colors', pathname === '/blog' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Blog
            </Link>
            <Link href="/contact"
              className={cn('text-sm font-semibold transition-colors', pathname === '/contact' ? 'text-white' : 'text-slate-300 hover:text-white')}>
              Contact
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/panier" className="relative p-1">
              <ShoppingCart className="text-slate-300 w-5 h-5 hover:text-white transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: C.yellow }}>
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
                      isAdmin
                        ? 'border text-blue-200 hover:bg-white/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    )}
                    style={isAdmin ? { borderColor: `${C.cyan}40`, background: `${C.cyan}15` } : {}}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white"
                      style={{ background: isAdmin ? C.cyan : 'rgba(255,255,255,0.2)' }}>
                      {(userProfile.full_name || userProfile.email)[0].toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate">{userProfile.full_name || userProfile.email.split('@')[0]}</span>
                    {isAdmin && (
                      <span className="text-[9px] text-white px-1.5 py-0.5 rounded-full font-black"
                        style={{ background: C.cyan }}>ADMIN</span>
                    )}
                    <ChevronDown className={cn('w-3 h-3 transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-56 rounded-xl shadow-2xl overflow-hidden z-50"
                        style={{ background: '#0d1f38', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <div className="px-4 py-3 border-b border-white/[0.07]">
                          <p className="text-xs font-black text-white truncate">{userProfile.full_name || '—'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{userProfile.email}</p>
                        </div>

                        <div className="py-1">
                          {/* Liens directs pour les clients */}
                          {!isStaff && (
                            <>
                              <Link href="/compte?tab=commandes" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Package className="w-4 h-4" style={{ color: C.cyan }} /> Mes commandes
                              </Link>
                              <Link href="/compte?tab=devis" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <FileText className="w-4 h-4" style={{ color: C.cyan }} /> Mes devis
                              </Link>
                              <Link href="/compte?tab=factures" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Receipt className="w-4 h-4" style={{ color: C.cyan }} /> Mes factures
                              </Link>
                              <Link href="/compte?tab=profil" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <UserCircle className="w-4 h-4" style={{ color: C.cyan }} /> Mon profil
                              </Link>
                            </>
                          )}

                          {/* Liens staff / admin */}
                          {isStaff && (
                            <>
                              <Link href="/compte" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <User className="w-4 h-4 text-slate-500" /> Mon compte
                              </Link>
                              <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <LayoutDashboard className="w-4 h-4 text-slate-500" /> Administration
                              </Link>
                              <Link href="/production" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Factory className="w-4 h-4 text-slate-500" /> Production
                              </Link>
                              <Link href="/production/jde" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Zap className="w-4 h-4" style={{ color: C.yellow }} /> JDE Admin
                              </Link>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <Link href="/admin?tab=clients" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Users className="w-4 h-4 text-slate-500" /> Gestion clients
                              </Link>
                              <Link href="/admin?tab=parametres" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                <Settings className="w-4 h-4 text-slate-500" /> Paramètres
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="py-1 border-t border-white/[0.07]">
                          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
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

      {/* Ligne CMYK bas du header */}
      <div className="h-[2px] flex">
        <div className="flex-1" style={{ background: C.cyan }} />
        <div className="flex-1" style={{ background: C.magenta }} />
        <div className="flex-1" style={{ background: C.yellow }} />
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden"
            style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <nav className="px-4 py-4 space-y-1">
              <Link href="/" className="block text-sm font-semibold py-2.5 text-slate-200"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Accueil</Link>
              <div className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {navCats.sur_mesure.length > 0 && (
                  <>
                    <Link href="/catalogue?type=sur_mesure"
                      className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1 transition-colors"
                      style={{ color: C.cyan }}>
                      Sur mesure →
                    </Link>
                    {navCats.sur_mesure.map((cat) => (
                      <Link key={cat.id} href={`/catalogue?type=sur_mesure&category=${cat.id}`}
                        className="block text-sm py-1.5 pl-3 text-slate-300">{cat.label}</Link>
                    ))}
                  </>
                )}
                {navCats.taille_standard.length > 0 && (
                  <>
                    <Link href="/catalogue?type=taille_standard"
                      className="text-[10px] font-black uppercase tracking-wider mt-3 mb-2 flex items-center gap-1 transition-colors"
                      style={{ color: C.magenta }}>
                      Taille standard →
                    </Link>
                    {navCats.taille_standard.map((cat) => (
                      <Link key={cat.id} href={`/catalogue?type=taille_standard&category=${cat.id}`}
                        className="block text-sm py-1.5 pl-3 text-slate-300">{cat.label}</Link>
                    ))}
                  </>
                )}
                <Link href="/catalogue" className="block text-sm font-black py-2 pl-3"
                  style={{ color: C.yellow }}>Tous les produits →</Link>
              </div>
              <Link href="/commande-rapide" className="flex items-center gap-2 text-sm font-black py-2.5"
                style={{ color: C.yellow, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Zap className="w-3.5 h-3.5" /> Commande rapide
              </Link>
              <Link href="/devis" className="block text-sm font-semibold py-2.5 text-slate-200"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Devis</Link>
              <Link href="/verifier-fichier" className="block text-sm font-semibold py-2.5 text-slate-200"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Vérifier mon fichier</Link>
              <Link href="/blog" className="block text-sm font-semibold py-2.5 text-slate-200"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Blog</Link>
              <Link href="/contact" className="block text-sm font-semibold py-2.5 text-slate-200"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Contact</Link>
              {userProfile ? (
                <>
                  <div className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs text-slate-400">{userProfile.email}</p>
                  </div>
                  {/* Liens clients (non-staff) */}
                  {!isStaff && (
                    <>
                      <Link href="/compte?tab=commandes" className="flex items-center gap-2 text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Package className="w-4 h-4" style={{ color: C.cyan }} /> Mes commandes
                      </Link>
                      <Link href="/compte?tab=devis" className="flex items-center gap-2 text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <FileText className="w-4 h-4" style={{ color: C.cyan }} /> Mes devis
                      </Link>
                      <Link href="/compte?tab=factures" className="flex items-center gap-2 text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Receipt className="w-4 h-4" style={{ color: C.cyan }} /> Mes factures
                      </Link>
                      <Link href="/compte?tab=profil" className="flex items-center gap-2 text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <UserCircle className="w-4 h-4" style={{ color: C.cyan }} /> Mon profil
                      </Link>
                    </>
                  )}
                  {/* Liens staff */}
                  {isStaff && (
                    <>
                      <Link href="/compte" className="block text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Mon compte</Link>
                      <Link href="/admin" className="block text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Administration</Link>
                      <Link href="/production" className="block text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Production</Link>
                      <Link href="/production/jde" className="block text-sm font-semibold py-2.5 text-slate-200"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>⚡ JDE Admin</Link>
                    </>
                  )}
                  {isAdmin && <Link href="/admin?tab=parametres" className="block text-sm font-semibold py-2.5 text-slate-200"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Paramètres</Link>}
                  <button onClick={handleLogout} className="block w-full text-left text-sm font-semibold py-2.5 text-red-400"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Déconnexion</button>
                </>
              ) : (
                <Link href="/auth/login" className="block text-sm font-semibold py-2.5 text-slate-200"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Se connecter</Link>
              )}
              <Link href="/catalogue"
                className="block text-slate-900 font-black text-sm text-center py-3 rounded-xl mt-3"
                style={{ background: C.yellow }}>
                Commander maintenant
              </Link>
              <a href="tel:+3242330138" suppressHydrationWarning className="flex items-center gap-2 text-slate-400 text-sm py-2">
                <Phone className="w-4 h-4" /> +32 4 233 01 38
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
