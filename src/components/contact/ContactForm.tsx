'use client'

import React, { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center h-full flex flex-col items-center justify-center">
      <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">Message envoyé !</h2>
      <p className="text-slate-500 text-sm">On vous répond rapidement. Merci, {form.name}.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <h2 className="text-lg font-extrabold text-slate-900 mb-6">Envoyez-nous un message</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nom *</label>
            <input required name="name" value={form.name} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email *</label>
            <input required type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Téléphone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Sujet</label>
            <select name="subject" value={form.subject} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sélectionner</option>
              <option>Demande de devis</option>
              <option>Information produit</option>
              <option>Suivi commande</option>
              <option>Projet urgent</option>
              <option>Autre</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Message *</label>
          <textarea required name="message" value={form.message} onChange={handleChange} rows={6}
            placeholder="Décrivez votre projet ou posez votre question..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : 'Envoyer le message'}
        </button>
      </form>
    </div>
  )
}
