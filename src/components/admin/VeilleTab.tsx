'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, RefreshCw, Zap, Shield, AlertTriangle,
  CheckCircle, ArrowRight, Lightbulb, Users, Calendar,
  HelpCircle, ChevronDown, ChevronUp, Target,
} from 'lucide-react'

interface VeilleData {
  brief: string
  insight: string
  tendances: string[]
  opportunites: string[]
  menaces: string[]
  swot_forces: string[]
  swot_faiblesses: string[]
  swot_opportunites: string[]
  swot_menaces: string[]
  concurrents: string[]
  actions: string[]
  questions: string[]
  generated_at: string
}

export default function VeilleTab() {
  const [data, setData] = useState<VeilleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openQ, setOpenQ] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/veille')
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }

      if (fullText.includes('__ERROR__')) {
        throw new Error(fullText.split('__ERROR__')[1]?.trim() ?? 'Erreur inconnue')
      }

      const [rawPart, metaPart] = fullText.split('__META__')
      // Extrait uniquement le bloc JSON (entre le premier { et le dernier })
      const start = rawPart.indexOf('{')
      const end = rawPart.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('JSON introuvable dans la réponse')
      const parsed = JSON.parse(rawPart.slice(start, end + 1))

      let generated_at = new Date().toISOString()
      if (metaPart) {
        try { generated_at = JSON.parse(metaPart.trim()).generated_at } catch { /* ignore */ }
      }

      setData({ ...parsed, generated_at })
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const horizonColor = (a: string) =>
    a.startsWith('🔴') ? 'border-l-red-400 bg-red-50' :
    a.startsWith('🟡') ? 'border-l-amber-400 bg-amber-50' :
    'border-l-emerald-400 bg-emerald-50'

  if (loading) return (
    <div className="space-y-5">
      <Header onRefresh={load} loading={true} date={null} />
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-7 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <p className="font-semibold text-sm">Analyse du marché en cours…</p>
        </div>
        <p className="text-indigo-200 text-xs leading-relaxed">
          L'IA analyse les tendances du secteur impression grand format en Belgique, la concurrence et les opportunités saisonnières. Environ 15 secondes.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
      </div>
    </div>
  )

  if (!data || error) return (
    <div className="space-y-5">
      <Header onRefresh={load} loading={false} date={null} />
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Erreur lors de la génération</p>
            <p className="text-xs text-red-600 mt-0.5 font-mono">{error}</p>
            <button onClick={load} className="mt-2 text-xs font-semibold text-red-700 underline">Réessayer</button>
          </div>
        </div>
      )}
      {!error && (
        <div className="py-20 text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">La veille se génère automatiquement…</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      <Header onRefresh={load} loading={false} date={data.generated_at} />

      {/* Brief exécutif */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3">Brief stratégique</p>
        <p className="text-sm leading-relaxed text-white/95">{data.brief}</p>
      </div>

      {/* Insight du mois */}
      {data.insight && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Insight du mois</p>
            <p className="text-sm text-amber-900 leading-relaxed">{data.insight}</p>
          </div>
        </div>
      )}

      {/* Opportunités + Menaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.opportunites?.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Opportunités
            </p>
            <ul className="space-y-2">
              {data.opportunites.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.menaces?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Menaces à surveiller
            </p>
            <ul className="space-y-2">
              {data.menaces.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tendances */}
      {data.tendances?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Tendances du secteur
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.tendances.map((t, i) => {
              const [titre, ...rest] = t.split(' : ')
              return (
                <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs font-bold text-slate-800 mb-0.5">{titre}</p>
                  {rest.length > 0 && <p className="text-[11px] text-slate-500 leading-relaxed">{rest.join(' : ')}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SWOT */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Analyse SWOT — Comink sur son marché
        </p>
        <div className="grid grid-cols-2 gap-3">
          <SwotQuadrant icon={<CheckCircle className="w-3.5 h-3.5" />} label="Forces" items={data.swot_forces} color="emerald" />
          <SwotQuadrant icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Axes d'amélioration" items={data.swot_faiblesses} color="orange" />
          <SwotQuadrant icon={<TrendingUp className="w-3.5 h-3.5" />} label="Opportunités de marché" items={data.swot_opportunites} color="blue" />
          <SwotQuadrant icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Menaces" items={data.swot_menaces} color="red" />
        </div>
      </div>

      {/* Concurrents */}
      {data.concurrents?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Paysage concurrentiel
          </p>
          <div className="space-y-2">
            {data.concurrents.map((c, i) => {
              const [qui, ...rest] = c.split(' — ')
              return (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">{i + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{qui}</p>
                    {rest.length > 0 && <p className="text-[11px] text-slate-500 mt-0.5">{rest.join(' — ')}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plan d'action */}
      {data.actions?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Plan d'action 30 jours
          </p>
          <div className="space-y-2">
            {data.actions.map((a, i) => (
              <div key={i} className={`border-l-4 rounded-r-xl px-4 py-3 text-xs text-slate-700 leading-relaxed ${horizonColor(a)}`}>
                {a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions stratégiques */}
      {data.questions?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Questions stratégiques à se poser
          </p>
          <div className="space-y-2">
            {data.questions.map((q, i) => (
              <button key={i} onClick={() => setOpenQ(openQ === i ? null : i)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">{q}</p>
                </div>
                {openQ === i
                  ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">Réfléchis à ces questions avant ta prochaine décision stratégique.</p>
        </div>
      )}
    </div>
  )
}

function Header({ onRefresh, loading, date }: { onRefresh: () => void; loading: boolean; date: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Veille marché</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {date
            ? `Analyse du ${new Date(date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Intelligence stratégique pour Comink'}
        </p>
      </div>
      <button onClick={onRefresh} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50">
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
      </button>
    </div>
  )
}

const swotColors: Record<string, { bg: string; text: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  orange:  { bg: 'bg-orange-50 border-orange-200',   text: 'text-orange-700',  dot: 'bg-orange-400' },
  blue:    { bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-700',    dot: 'bg-blue-400' },
  red:     { bg: 'bg-red-50 border-red-200',          text: 'text-red-700',     dot: 'bg-red-400' },
}

function SwotQuadrant({ icon, label, items, color }: { icon: React.ReactNode; label: string; items: string[]; color: string }) {
  const c = swotColors[color]
  return (
    <div className={`rounded-xl border p-3.5 ${c.bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5 ${c.text}`}>
        {icon} {label}
      </p>
      <ul className="space-y-1.5">
        {items?.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${c.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
