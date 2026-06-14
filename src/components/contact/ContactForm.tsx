'use client'

import React, { useState } from 'react'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400', navyMid: '#0d1f38' }

const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-shadow placeholder:text-slate-500'
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const focusStyle = (e: React.FocusEvent<any>) => { e.target.style.boxShadow = `0 0 0 2px ${C.cyan}40` }
  const blurStyle = (e: React.FocusEvent<any>) => { e.target.style.boxShadow = '' }

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
    <div className="rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: `${C.cyan}15` }}>
        <CheckCircle className="w-10 h-10" style={{ color: C.cyan }} />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Message envoyé !</h2>
      <p className="text-slate-400 text-sm">On vous répond rapidement. Merci, {form.name}.</p>
      <div className="mt-4 h-[3px] rounded-full w-12 mx-auto" style={{ background: C.yellow }} />
    </div>
  )

  return (
    <div className="rounded-2xl p-6 md:p-8"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 className="text-lg font-black text-white mb-6">Envoyez-nous un message</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">Nom *</label>
            <input required name="name" value={form.name} onChange={handleChange}
              className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">Email *</label>
            <input required type="email" name="email" value={form.email} onChange={handleChange}
              className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">Téléphone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">Sujet</label>
            <select name="subject" value={form.subject} onChange={handleChange}
              className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
              <option value="" style={{ background: C.navyMid, color: 'white' }}>Sélectionner</option>
              <option style={{ background: C.navyMid, color: 'white' }}>Demande de devis</option>
              <option style={{ background: C.navyMid, color: 'white' }}>Information produit</option>
              <option style={{ background: C.navyMid, color: 'white' }}>Suivi commande</option>
              <option style={{ background: C.navyMid, color: 'white' }}>Projet urgent</option>
              <option style={{ background: C.navyMid, color: 'white' }}>Autre</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">Message *</label>
          <textarea required name="message" value={form.message} onChange={handleChange} rows={6}
            placeholder="Décrivez votre projet ou posez votre question..."
            className={inputCls + ' resize-none'} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <button type="submit" disabled={submitting}
          className="group relative w-full font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm text-white hover:opacity-90 disabled:opacity-60 overflow-hidden"
          style={{ background: C.cyan, boxShadow: `0 8px 24px ${C.cyan}40` }}>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
            : <><span>Envoyer le message</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
        </button>
      </form>
    </div>
  )
}
