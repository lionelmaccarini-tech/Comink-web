'use client'

import React, { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

interface FormData {
  name: string
  email: string
  phone: string
  company: string
  message: string
  budget: string
  deadline: string
}

const BUDGETS = ['< 500 €', '500 – 1 000 €', '1 000 – 5 000 €', '> 5 000 €', 'À définir']

export default function DevisForm() {
  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', company: '', message: '', budget: '', deadline: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setSent(true)
    } catch {
      setError("Une erreur est survenue. Appelez-nous au +32 4 233 01 38.")
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Demande envoyée !</h2>
        <p className="text-slate-500 text-sm">Nous vous répondons en moins de 2h ouvrables. Merci, {form.name}.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nom *</label>
            <input required name="name" value={form.name} onChange={handleChange}
              placeholder="Jean Dupont"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email *</label>
            <input required type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="jean@entreprise.be"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Téléphone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              placeholder="+32 4 ..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Société</label>
            <input name="company" value={form.company} onChange={handleChange}
              placeholder="Votre entreprise"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Budget estimé</label>
            <select name="budget" value={form.budget} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sélectionner</option>
              {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Date limite</label>
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Description du projet *</label>
          <textarea required name="message" value={form.message} onChange={handleChange}
            rows={5}
            placeholder="Décrivez votre projet : type de produit, dimensions, quantité, fichiers disponibles..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : 'Envoyer ma demande de devis'}
        </button>

        <p className="text-center text-xs text-slate-400">
          Réponse garantie en moins de 2h ouvrables. Ou appelez-nous : <a href="tel:+3242330138" className="text-blue-600 font-semibold">+32 4 233 01 38</a>
        </p>
      </form>
    </div>
  )
}
