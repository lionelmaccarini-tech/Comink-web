'use client'

import React, { useState, useRef } from 'react'
import { CheckCircle, Loader2, ArrowRight, Paperclip, X, FileText } from 'lucide-react'

const C = { cyan: '#00AEEF', magenta: '#E8001A', yellow: '#F5C400' }

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
const ACCEPTED = '.pdf,.ai,.eps,.png,.jpg,.jpeg,.zip,.svg,.psd,.indd,.tif,.tiff,.xlsx,.xls,.csv'
const MAX_MB = 20

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'white',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  transition: 'box-shadow 0.15s',
}

const selectOptionStyle: React.CSSProperties = {
  background: '#0d1f38',
  color: 'white',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5"
        style={{ color: C.cyan }}>{label}</label>
      {children}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function DevisForm() {
  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', company: '', message: '', budget: '', deadline: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const focusStyle = (e: React.FocusEvent<any>) => {
    e.target.style.boxShadow = `0 0 0 2px ${C.cyan}50`
    e.target.style.borderColor = `${C.cyan}80`
  }
  const blurStyle = (e: React.FocusEvent<any>) => {
    e.target.style.boxShadow = ''
    e.target.style.borderColor = 'rgba(255,255,255,0.15)'
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('')
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`Fichier trop lourd (max ${MAX_MB} Mo)`)
      return
    }
    setFile(f)
  }

  const removeFile = () => {
    setFile(null)
    setFileError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('attachment', file)

      const res = await fetch('/api/quotes', { method: 'POST', body: fd })
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
      <div className="rounded-2xl p-10 text-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: `2px solid ${C.cyan}40` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: `${C.cyan}20`, border: `2px solid ${C.cyan}40` }}>
          <CheckCircle className="w-10 h-10" style={{ color: C.cyan }} />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Demande envoyée !</h2>
        <p className="text-slate-400 text-sm">Nous revenons vers vous rapidement. Merci, {form.name}.</p>
        <div className="mt-4 h-[3px] rounded-full w-12 mx-auto" style={{ background: C.yellow }} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6 md:p-8"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom *">
            <input
              required name="name" value={form.name} onChange={handleChange}
              placeholder="Jean Dupont"
              style={{ ...inputStyle }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </Field>
          <Field label="Email *">
            <input
              required type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="jean@entreprise.be"
              style={{ ...inputStyle }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </Field>
          <Field label="Téléphone">
            <input
              name="phone" value={form.phone} onChange={handleChange}
              placeholder="+32 4 ..."
              style={{ ...inputStyle }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </Field>
          <Field label="Société">
            <input
              name="company" value={form.company} onChange={handleChange}
              placeholder="Votre entreprise"
              style={{ ...inputStyle }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </Field>
          <Field label="Budget estimé">
            <select
              name="budget" value={form.budget} onChange={handleChange}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              onFocus={focusStyle} onBlur={blurStyle}
            >
              <option value="" style={selectOptionStyle}>Sélectionner</option>
              {BUDGETS.map(b => <option key={b} value={b} style={selectOptionStyle}>{b}</option>)}
            </select>
          </Field>
          <Field label="Date limite">
            <input
              type="date" name="deadline" value={form.deadline} onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark' } as React.CSSProperties}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </Field>
        </div>

        <Field label="Description du projet *">
          <textarea
            required name="message" value={form.message} onChange={handleChange}
            rows={5}
            placeholder="Décrivez votre projet : type de produit, dimensions, quantité, fichiers disponibles..."
            style={{ ...inputStyle, resize: 'none' }}
            onFocus={focusStyle} onBlur={blurStyle}
          />
        </Field>

        {/* Zone fichier */}
        <Field label="Fichier annexe">
          {!file ? (
            <label
              className="flex items-center gap-3 w-full cursor-pointer rounded-xl px-4 py-4 transition-all"
              style={{
                border: `2px dashed rgba(255,255,255,0.15)`,
                background: 'rgba(255,255,255,0.02)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = `${C.cyan}80`
                el.style.background = `rgba(0,174,239,0.05)`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.15)'
                el.style.background = 'rgba(255,255,255,0.02)'
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) {
                  if (f.size > MAX_MB * 1024 * 1024) { setFileError(`Fichier trop lourd (max ${MAX_MB} Mo)`); return }
                  setFile(f); setFileError('')
                }
              }}
            >
              <Paperclip className="w-5 h-5 flex-shrink-0" style={{ color: C.cyan }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300">Joindre un fichier</p>
                <p className="text-xs text-slate-500 mt-0.5">PDF, AI, PNG, JPG, ZIP, Excel… — max {MAX_MB} Mo</p>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-lg text-slate-900 flex-shrink-0"
                style={{ background: C.yellow }}>
                Parcourir
              </span>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleFile}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 w-full rounded-xl px-4 py-3"
              style={{ background: `rgba(0,174,239,0.08)`, border: `1px solid ${C.cyan}30` }}>
              <FileText className="w-5 h-5 flex-shrink-0" style={{ color: C.cyan }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button type="button" onClick={removeFile}
                className="p-1 rounded-lg transition-colors flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
          {fileError && (
            <p className="text-sm mt-1.5 px-3 py-1.5 rounded-lg"
              style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {fileError}
            </p>
          )}
        </Field>

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group relative w-full font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60 overflow-hidden"
          style={{ background: C.cyan, color: 'white', boxShadow: `0 8px 24px ${C.cyan}30` }}
        >
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
            : <><span>Envoyer ma demande de devis</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
          }
        </button>

        <p className="text-center text-xs text-slate-500">
          Une question ? Appelez-nous :{' '}
          <a href="tel:+3242330138" className="font-black hover:underline" style={{ color: C.cyan }}>
            +32 4 233 01 38
          </a>
        </p>
      </form>
    </div>
  )
}
