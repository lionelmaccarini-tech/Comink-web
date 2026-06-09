'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Globe, Monitor, Smartphone, Tablet, RefreshCw,
  TrendingUp, Eye, Zap, LogIn, MousePointer, ArrowUpRight,
  MapPin, Chrome, Signal, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  range: number
  overview: {
    totalSessions: number
    totalPageviews: number
    todaySessions: number
    uniqueLoggedIn: number
    loggedInSessions: number
    bounceRate: number
    avgPagesPerSession: number
    activeNow: number
  }
  activeNow: ActiveSession[]
  dailyTrend: { date: string; count: number }[]
  countries: { country: string; code: string; count: number }[]
  devices: { device: string; count: number }[]
  browsers: { browser: string; count: number }[]
  osStats: { os: string; count: number }[]
  topPages: { page: string; count: number }[]
  referrers: { source: string; count: number }[]
  trafficMediums: { medium: string; count: number }[]
  recentLoggedIn: (ActiveSession & { profile: UserProfile | null })[]
  demographics: {
    gender: { gender: string; code: string; count: number }[]
    age:    { group: string; count: number }[]
  }
}

interface ActiveSession {
  session_id: string
  user_email: string | null
  country: string | null
  country_code: string | null
  city: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  last_seen: string
  landing_page: string | null
  page_count: number
  latitude: number | null
  longitude: number | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company: string | null
  gender: string | null
  birth_year: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  BE:'🇧🇪', FR:'🇫🇷', LU:'🇱🇺', NL:'🇳🇱', DE:'🇩🇪', GB:'🇬🇧', CH:'🇨🇭',
  IT:'🇮🇹', ES:'🇪🇸', US:'🇺🇸', CA:'🇨🇦', MA:'🇲🇦', TN:'🇹🇳', DZ:'🇩🇿',
  SN:'🇸🇳', PT:'🇵🇹', AU:'🇦🇺', JP:'🇯🇵', BR:'🇧🇷', MX:'🇲🇽', PL:'🇵🇱',
  RO:'🇷🇴', RU:'🇷🇺', CN:'🇨🇳', IN:'🇮🇳', XX:'🌍',
}
const flag = (code: string | null) => FLAG[code ?? 'XX'] ?? '🌍'

const DEVICE_ICON = {
  desktop: Monitor, mobile: Smartphone, tablet: Tablet,
}

function DeviceIcon({ type, className }: { type: string | null; className?: string }) {
  const Icon = DEVICE_ICON[(type ?? 'desktop') as keyof typeof DEVICE_ICON] ?? Monitor
  return <Icon className={cn('w-4 h-4', className)} />
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

function BarRow({ label, count, max, color = 'blue' }: {
  label: string; count: number; max: number; color?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 2
  const colors: Record<string, string> = {
    blue:   'bg-blue-500',
    green:  'bg-emerald-500',
    purple: 'bg-purple-500',
    amber:  'bg-amber-500',
    sky:    'bg-sky-500',
    rose:   'bg-rose-500',
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 truncate text-slate-700 flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={cn('h-2 rounded-full transition-all', colors[color] ?? colors.blue)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-bold text-slate-500">{count}</span>
    </div>
  )
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const w = 200, h = 48, pad = 2
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2)
    const y = h - pad - ((d.count / max) * (h - pad * 2))
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2)
        const y = h - pad - ((d.count / max) * (h - pad * 2))
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#3b82f6" />
      })}
    </svg>
  )
}

function StatCard({
  label, value, sub, icon: Icon, color = 'blue', trend,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: string; trend?: number
}) {
  const colors: Record<string, { bg: string; icon: string }> = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600' },
    sky:    { bg: 'bg-sky-50',    icon: 'text-sky-600' },
    rose:   { bg: 'bg-rose-50',   icon: 'text-rose-600' },
  }
  const c = colors[color] ?? colors.blue
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('p-2.5 rounded-xl', c.bg)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn('mt-2 text-xs font-semibold flex items-center gap-1', trend >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
          <TrendingUp className="w-3.5 h-3.5" />
          {trend >= 0 ? '+' : ''}{trend}% vs période préc.
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsTab() {
  const [data, setData]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange]   = useState(7)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`)
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s for "active now"
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  if (!data && loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        Chargement des analytics…
      </div>
    )
  }

  const ov = data?.overview
  const maxCountry  = Math.max(...(data?.countries   ?? []).map(c => c.count), 1)
  const maxDevice   = Math.max(...(data?.devices     ?? []).map(d => d.count), 1)
  const maxBrowser  = Math.max(...(data?.browsers    ?? []).map(b => b.count), 1)
  const maxPage     = Math.max(...(data?.topPages    ?? []).map(p => p.count), 1)
  const maxRef      = Math.max(...(data?.referrers   ?? []).map(r => r.count), 1)
  const maxOs       = Math.max(...(data?.osStats     ?? []).map(o => o.count), 1)
  const maxGender   = Math.max(...(data?.demographics.gender ?? []).map(g => g.count), 1)
  const maxAge      = Math.max(...(data?.demographics.age    ?? []).map(a => a.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Analytics visiteurs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-BE')}
            {autoRefresh && ' · actualisation auto 30s'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={e => setRange(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Aujourd'hui</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
            )}
          >
            <Signal className={cn('w-3.5 h-3.5', autoRefresh && 'animate-pulse')} />
            Live
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Actifs maintenant" value={ov?.activeNow ?? 0}         icon={Zap}          color="green" />
        <StatCard label="Sessions aujourd'hui" value={ov?.todaySessions ?? 0}  icon={Users}        color="blue" />
        <StatCard label={`Sessions (${range}j)`} value={ov?.totalSessions ?? 0} icon={TrendingUp}  color="sky" />
        <StatCard label="Pages vues" value={ov?.totalPageviews ?? 0}            icon={Eye}          color="purple" />
        <StatCard label="Connectés (inscrits)" value={ov?.loggedInSessions ?? 0} icon={LogIn}      color="amber" />
        <StatCard label="Utilisateurs uniques" value={ov?.uniqueLoggedIn ?? 0}  icon={Users}       color="rose" />
        <StatCard label="Taux de rebond" value={`${ov?.bounceRate ?? 0}%`} sub="1 page/session" icon={MousePointer} color="blue" />
        <StatCard label="Pages/session" value={ov?.avgPagesPerSession ?? 0}    icon={ArrowUpRight} color="green" />
      </div>

      {/* ── Tendance journalière ── */}
      {(data?.dailyTrend?.length ?? 0) > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Tendance — sessions par jour
          </h3>
          <div className="flex items-end gap-1 h-16 overflow-hidden">
            {data!.dailyTrend.map((d, i) => {
              const max = Math.max(...data!.dailyTrend.map(x => x.count), 1)
              const h = Math.max(2, Math.round((d.count / max) * 56))
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm group-hover:bg-blue-400 transition-colors cursor-default"
                    style={{ height: `${h}px` }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {d.date.slice(5)}: {d.count}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{data!.dailyTrend[0]?.date.slice(5)}</span>
            <span>{data!.dailyTrend[data!.dailyTrend.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {/* ── Actifs maintenant ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-bold text-slate-700 text-sm">
            Connexions en direct
            <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {data?.activeNow.length ?? 0}
            </span>
          </h3>
        </div>
        {!data?.activeNow.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">Aucune session active en ce moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Visiteur</th>
                  <th className="px-4 py-3 text-left">Localisation</th>
                  <th className="px-4 py-3 text-left">Appareil</th>
                  <th className="px-4 py-3 text-left">Page d'entrée</th>
                  <th className="px-4 py-3 text-left">Pages vues</th>
                  <th className="px-4 py-3 text-left">Actif il y a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.activeNow.map(s => (
                  <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {s.user_email ? (
                        <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                          <LogIn className="w-3 h-3" />
                          <span className="truncate max-w-[140px]" title={s.user_email}>{s.user_email}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Visiteur anonyme</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">{flag(s.country_code)}</span>
                        <span className="text-slate-600">
                          {[s.city, s.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-600">
                        <DeviceIcon type={s.device_type} className="text-slate-400" />
                        {s.browser} · {s.os}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-[160px]" title={s.landing_page ?? ''}>
                      {s.landing_page || '/'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">
                        {s.page_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{timeAgo(s.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Grille : Pays + Appareils + Navigateurs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pays */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-500" /> Pays
          </h3>
          <div className="space-y-2.5">
            {(data?.countries ?? []).slice(0, 8).map(c => (
              <div key={c.code} className="flex items-center gap-2">
                <span className="text-base w-6 flex-shrink-0">{flag(c.code)}</span>
                <BarRow label={c.country} count={c.count} max={maxCountry} color="sky" />
              </div>
            ))}
            {!data?.countries.length && <p className="text-slate-400 text-xs text-center py-4">Aucune donnée</p>}
          </div>
        </div>

        {/* Appareils */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-500" /> Appareils
          </h3>
          <div className="space-y-2.5">
            {(data?.devices ?? []).map(d => (
              <div key={d.device} className="flex items-center gap-2">
                <DeviceIcon type={d.device} className="text-slate-400 w-4 h-4 flex-shrink-0" />
                <BarRow
                  label={d.device === 'desktop' ? 'Ordinateur' : d.device === 'mobile' ? 'Mobile' : d.device === 'tablet' ? 'Tablette' : d.device}
                  count={d.count}
                  max={maxDevice}
                  color="purple"
                />
              </div>
            ))}
          </div>

          <h3 className="font-bold text-slate-700 text-sm mt-6 mb-4 flex items-center gap-2">
            <Chrome className="w-4 h-4 text-amber-500" /> Navigateurs
          </h3>
          <div className="space-y-2.5">
            {(data?.browsers ?? []).slice(0, 6).map(b => (
              <BarRow key={b.browser} label={b.browser} count={b.count} max={maxBrowser} color="amber" />
            ))}
          </div>
        </div>

        {/* OS + Sources */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-green-500" /> Systèmes d'exploitation
          </h3>
          <div className="space-y-2.5">
            {(data?.osStats ?? []).slice(0, 6).map(o => (
              <BarRow key={o.os} label={o.os} count={o.count} max={maxOs} color="green" />
            ))}
          </div>

          <h3 className="font-bold text-slate-700 text-sm mt-6 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-rose-500" /> Sources de trafic
          </h3>
          <div className="space-y-2.5">
            {(data?.referrers ?? []).slice(0, 6).map(r => (
              <BarRow key={r.source} label={r.source} count={r.count} max={maxRef} color="rose" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Top pages ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" /> Pages les plus visitées
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(data?.topPages ?? []).map(p => (
            <BarRow key={p.page} label={p.page || '/'} count={p.count} max={maxPage} color="blue" />
          ))}
          {!data?.topPages.length && <p className="text-slate-400 text-xs col-span-2 text-center py-4">Aucune donnée</p>}
        </div>
      </div>

      {/* ── Démographie (utilisateurs inscrits) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> Démographie — utilisateurs inscrits uniquement
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Basé sur les profils des {data?.recentLoggedIn.length ?? 0} derniers utilisateurs connectés.
          Le genre et l'âge sont renseignés volontairement dans leur profil.
        </p>

        {!data?.demographics.gender.length && !data?.demographics.age.length ? (
          <p className="text-slate-400 text-sm text-center py-6 bg-slate-50 rounded-xl">
            Aucune donnée démographique disponible.<br />
            <span className="text-xs">Les utilisateurs peuvent renseigner genre et âge dans leur profil.</span>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Genre</p>
              <div className="space-y-2.5">
                {(data?.demographics.gender ?? []).map(g => (
                  <BarRow key={g.code} label={g.gender} count={g.count} max={maxGender} color="violet" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tranche d'âge</p>
              <div className="space-y-2.5">
                {(data?.demographics.age ?? []).map(a => (
                  <BarRow key={a.group} label={a.group} count={a.count} max={maxAge} color="amber" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Utilisateurs connectés récents ── */}
      {(data?.recentLoggedIn.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <LogIn className="w-4 h-4 text-blue-500" />
              Derniers utilisateurs connectés
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {data!.recentLoggedIn.length}
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-left">Société</th>
                  <th className="px-4 py-3 text-left">Localisation</th>
                  <th className="px-4 py-3 text-left">Appareil</th>
                  <th className="px-4 py-3 text-left">Genre / Âge</th>
                  <th className="px-4 py-3 text-left">Dernière visite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data!.recentLoggedIn.map(s => {
                  const p = s.profile
                  const age = p?.birth_year ? new Date().getFullYear() - p.birth_year : null
                  const genderLabel: Record<string, string> = { M: '♂', F: '♀', NB: '⚧', NS: '–' }
                  return (
                    <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{p?.full_name || s.user_email}</p>
                        <p className="text-xs text-slate-400">{p?.full_name ? s.user_email : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{p?.company || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="text-base">{flag(s.country_code)}</span>
                          <span className="text-slate-600 text-xs">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <DeviceIcon type={s.device_type} className="text-slate-300" />
                          {s.browser}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {p?.gender ? `${genderLabel[p.gender] ?? p.gender} ${age ? `· ${age} ans` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{timeAgo(s.last_seen)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note GA */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold">💡 Pour les données démographiques des visiteurs anonymes</p>
        <p className="mt-1 text-blue-700">
          Google Analytics 4 (déjà configuré sur le site) peut fournir des estimations de genre/âge pour
          les visiteurs anonymes via Google Signals. Activez-le dans votre compte GA4 → Admin → Google Signals.
        </p>
      </div>
    </div>
  )
}
