'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { usePathname } from 'next/navigation'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#060e1f' }

const productLinks = [
  { label: 'Banderoles', href: '/catalogue?category=banderoles' },
  { label: 'Bâches', href: '/catalogue?category=baches' },
  { label: 'Roll-up', href: '/catalogue?category=roll_up' },
  { label: 'Adhésifs', href: '/catalogue?category=adhesifs' },
  { label: 'Drapeaux', href: '/catalogue?category=drapeaux' },
  { label: 'Panneaux', href: '/catalogue?category=panneaux' },
]

const serviceLinks = [
  { label: 'Commande rapide', href: '/commande-rapide' },
  { label: 'Demander un devis', href: '/devis' },
  { label: 'Suivi de commande', href: '/compte' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

export default function Footer() {
  const pathname = usePathname()
  const BACKOFFICE = ['/admin', '/production', '/crm']
  if (BACKOFFICE.some(p => pathname.startsWith(p))) return null

  return (
    <footer style={{ background: C.navy }}>
      {/* Ligne CMYK */}
      <div className="h-[3px] flex">
        <div className="flex-1" style={{ background: C.cyan }} />
        <div className="flex-1" style={{ background: C.magenta }} />
        <div className="flex-1" style={{ background: C.yellow }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <img
              src="https://media.base44.com/images/public/69b6df678c8f8fabdf29d048/3a7588cd1_logo_comink_png_f6b84109-9ae2-455d-a799-bce0af0abe08.png"
              alt="Comink"
              className="h-12 w-auto mb-4"
            />
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Votre imprimeur grand format en Belgique depuis plus de 15 ans.
              Qualité pro, délais respectés, production locale à Liège.
            </p>
          </div>

          {/* Produits */}
          <div>
            <h4 className="font-black text-sm mb-4 text-white uppercase tracking-wider">Nos produits</h4>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/catalogue" className="text-sm font-black hover:opacity-80 transition-opacity"
                  style={{ color: C.yellow }}>
                  Tous les produits →
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-black text-sm mb-4 text-white uppercase tracking-wider">Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black text-sm mb-4 text-white uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                <span>Rue de Bruxelles 174h<br />4340 Awans, Belgique</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: C.cyan }} />
                <a href="tel:+3242330138" className="hover:text-white transition-colors" suppressHydrationWarning>+32 4 233 01 38</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: C.cyan }} />
                <a href="mailto:info@comink.be" className="hover:text-white transition-colors">info@comink.be</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                <span>Lun–Ven : 8h–17h</span>
              </li>
            </ul>

            {/* Mini CTA */}
            <div className="mt-5">
              <Link href="/devis"
                className="inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-lg text-slate-900 hover:opacity-90 transition-opacity"
                style={{ background: C.yellow }}>
                Devis gratuit en 2h →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-slate-500">© {new Date().getFullYear()} Comink — Tous droits réservés</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            <Link href="/conditions-d-utilisation" className="hover:text-slate-300 transition-colors">Conditions d'utilisation</Link>
            <Link href="/conditions-generales-de-ventes" className="hover:text-slate-300 transition-colors">CGV</Link>
            <Link href="/informations-legales" className="hover:text-slate-300 transition-colors">Informations légales</Link>
            <Link href="/paiement-securise" className="hover:text-slate-300 transition-colors">Paiement sécurisé</Link>
            <Link href="/mentions-legales" className="hover:text-slate-300 transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-slate-300 transition-colors">Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
