'use client'

import React from 'react'
import { CheckCircle, AlertTriangle, XCircle, Loader2, Sparkles } from 'lucide-react'

export interface AnalysisResult {
  score: number
  status: 'ok' | 'warning' | 'error'
  summary: string
  checks: Array<{
    id: string
    label: string
    status: 'ok' | 'warning' | 'error'
    message: string
    detail?: string
  }>
  recommendations?: string[]
}

const STATUS_ICON = {
  ok:      <CheckCircle  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
  error:   <XCircle      className="w-3.5 h-3.5 text-red-500    flex-shrink-0" />,
}

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600'

const SCORE_BG = (s: number) =>
  s >= 80 ? 'bg-emerald-50 border-emerald-200' : s >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

interface Props {
  result: AnalysisResult | null
  loading: boolean
  error?: string
}

export default function FileAnalysisResult({ result, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
        <span>Analyse en cours avec Claude…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 py-1">
        Analyse indisponible : {error}
      </div>
    )
  }

  if (!result) return null

  return (
    <div className={`rounded-lg border p-3 mt-2 ${SCORE_BG(result.score)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Analyse Claude
        </div>
        <span className={`text-lg font-bold ${SCORE_COLOR(result.score ?? 0)}`}>
          {typeof result.score === 'number' ? `${result.score}/100` : '—'}
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-2">{result.summary}</p>

      {/* Checks */}
      <div className="space-y-1.5">
        {(result.checks ?? []).map(check => (
          <div key={check.id} className="flex items-start gap-2">
            {STATUS_ICON[check.status]}
            <div className="min-w-0">
              <span className="text-xs font-medium text-slate-700">{check.label} — </span>
              <span className="text-xs text-slate-500">{check.message}</span>
              {check.detail && (
                <p className="text-[10px] text-slate-400 mt-0.5">{check.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recommandations</p>
          <ul className="space-y-0.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                <span className="text-slate-400 flex-shrink-0">•</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
