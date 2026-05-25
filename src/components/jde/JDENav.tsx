'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useJDE } from './JDEContext'
import { ShoppingCart, Menu, X } from 'lucide-react'

export default function JDENav() {
  const pathname = usePathname()
  const { jdeClient, cartCount } = useJDE()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '/jde/catalogue', label: 'Catalogue' },
    { href: '/jde/panier', label: 'Panier' },
    { href: '/jde/commandes', label: 'Mes commandes' },
    { href: '/jde/compte', label: 'Mon compte' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="bg-[#E8271A] shadow-md">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/jde" className="flex-shrink-0">
            <span className="inline-flex items-center bg-[#F5C200] text-slate-900 font-extrabold text-lg px-4 py-1.5 rounded-xl tracking-tight">
              PRINT MY JDE
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'bg-white/20 text-white'
                    : 'text-red-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
                {href === '/jde/panier' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#F5C200] text-slate-900 text-xs font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Points badge + mobile toggle */}
          <div className="flex items-center gap-3">
            {jdeClient && (
              <div className="hidden sm:flex items-center bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full gap-1">
                <span className="text-[#F5C200]">{jdeClient.points_balance}</span>
                <span>pts</span>
              </div>
            )}
            <Link href="/jde/panier" className="relative md:hidden text-white">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F5C200] text-slate-900 text-xs font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden text-white p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#c41f14] border-t border-red-700">
          <div className="px-4 py-2 space-y-1">
            {jdeClient && (
              <div className="flex items-center gap-2 px-3 py-2 text-red-100 text-xs">
                <span>Solde :</span>
                <span className="text-[#F5C200] font-bold">{jdeClient.points_balance} pts</span>
              </div>
            )}
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'bg-white/20 text-white'
                    : 'text-red-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {href === '/jde/panier' && cartCount > 0 && (
                  <span className="bg-[#F5C200] text-slate-900 text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
