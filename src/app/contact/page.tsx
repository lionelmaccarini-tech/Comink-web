import type { Metadata } from 'next'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez Comink pour toute question sur vos projets d\'impression grand format. Liège, Belgique.',
}

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navy: '#09111f', navyMid: '#0d1f38' }

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: C.navy }}>
      {/* Hero */}
      <div className="text-white relative overflow-hidden" style={{ background: C.navy }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] flex">
          <div className="flex-1" style={{ background: C.cyan }} />
          <div className="flex-1" style={{ background: C.magenta }} />
          <div className="flex-1" style={{ background: C.yellow }} />
        </div>
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: C.cyan }}>◆ ON EST LÀ POUR VOUS</p>
          <h1 className="text-3xl md:text-4xl font-black text-white">Contactez-nous</h1>
          <div className="h-[3px] rounded-full mt-4 w-12 mx-auto" style={{ background: C.cyan }} />
          <p className="mt-3 font-semibold" style={{ color: '#cbd5e1' }}>Devis, questions, projets urgents — on répond vite.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Infos contact */}
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-black text-white mb-4">Coordonnées</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                  <div>
                    <p className="font-semibold text-white">Adresse</p>
                    <p>Rue de Bruxelles 174h<br />4340 Awans, Belgique</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                  <div>
                    <p className="font-semibold text-white">Téléphone</p>
                    <a href="tel:+3242330138" className="font-bold hover:underline" style={{ color: C.cyan }}>+32 4 233 01 38</a>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                  <div>
                    <p className="font-semibold text-white">Email</p>
                    <a href="mailto:info@comink.be" className="font-bold hover:underline" style={{ color: C.cyan }}>info@comink.be</a>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
                  <div>
                    <p className="font-semibold text-white">Horaires</p>
                    <p>Lun – Ven : 8h00 – 17h00</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Bloc urgent */}
            <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: C.navyMid }}>
              {/* Mini ligne CMYK */}
              <div className="absolute top-0 left-0 right-0 h-[3px] flex">
                <div className="flex-1" style={{ background: C.cyan }} />
                <div className="flex-1" style={{ background: C.magenta }} />
                <div className="flex-1" style={{ background: C.yellow }} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 mt-1" style={{ color: C.cyan }}>PROJET URGENT ?</p>
              <p className="font-black text-lg mb-1">On gère.</p>
              <p className="text-sm text-slate-300 font-semibold mb-5">Devis en moins de 2h, même le week-end.</p>
              <a href="tel:+3242330138"
                className="inline-flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-xl text-slate-900 hover:opacity-90 transition-opacity"
                style={{ background: C.yellow }}>
                Appeler maintenant →
              </a>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
