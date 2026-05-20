import type { Metadata } from 'next'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez Comink pour toute question sur vos projets d\'impression grand format. Liège, Belgique.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">ON EST LÀ POUR VOUS</p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Contactez-nous</h1>
          <p className="text-slate-400 mt-2">Devis, questions, projets urgents — on répond vite.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Infos contact */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Coordonnées</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Adresse</p>
                    <p>Rue de Bruxelles 174h<br />4340 Awans, Belgique</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <Phone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Téléphone</p>
                    <a href="tel:+3242330138" className="text-blue-600 hover:underline">+32 4 233 01 38</a>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href="mailto:info@comink.be" className="text-blue-600 hover:underline">info@comink.be</a>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Horaires</p>
                    <p>Lun – Ven : 8h00 – 17h00</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-600 rounded-2xl p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-200">PROJET URGENT ?</p>
              <p className="font-bold text-lg mb-1">On gère.</p>
              <p className="text-sm text-blue-200 mb-4">Devis en moins de 2h, même le week-end.</p>
              <a href="tel:+3242330138" className="bg-white text-blue-700 font-bold text-sm px-4 py-2.5 rounded-lg inline-block hover:bg-blue-50 transition-colors">
                Appeler maintenant
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
