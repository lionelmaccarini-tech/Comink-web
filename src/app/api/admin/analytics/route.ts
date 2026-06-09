import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600 * 1000).toISOString()
}

function topN<T extends { count: number }>(arr: T[], n = 10): T[] {
  return arr.sort((a, b) => b.count - a.count).slice(0, n)
}

// GET /api/admin/analytics?range=7  (7 | 30 | 90)
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get('range') ?? '7') || 7
    const since = daysAgo(range)
    const supabase = await createServiceClient()

    // ── Active now (last 5 min) ──────────────────────────────────────────────
    const { data: activeSessions } = await supabase
      .from('analytics_sessions')
      .select('session_id, user_email, country, country_code, city, device_type, browser, os, last_seen, landing_page, page_count, latitude, longitude')
      .gte('last_seen', hoursAgo(0.083)) // 5 min
      .eq('is_bot', false)
      .order('last_seen', { ascending: false })

    // ── Sessions in range ────────────────────────────────────────────────────
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('session_id, user_id, user_email, country, country_code, city, device_type, browser, os, referrer_host, utm_source, utm_medium, first_seen, last_seen, page_count, landing_page')
      .gte('first_seen', since)
      .eq('is_bot', false)
      .order('first_seen', { ascending: false })

    const allSessions = sessions ?? []
    const totalSessions = allSessions.length
    const uniqueUsers   = new Set(allSessions.filter(s => s.user_id).map(s => s.user_id)).size
    const loggedIn      = allSessions.filter(s => s.user_id).length
    const bounces       = allSessions.filter(s => s.page_count === 1).length

    // Today
    const todayStr = daysAgo(0)
    const todaySessions = allSessions.filter(s => s.first_seen >= todayStr)

    // ── Page views in range ──────────────────────────────────────────────────
    const { data: pageviews } = await supabase
      .from('analytics_pageviews')
      .select('page, session_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    const allPV = pageviews ?? []
    const totalPV = allPV.length

    // ── Countries ────────────────────────────────────────────────────────────
    const countryMap = new Map<string, { country: string; code: string; count: number }>()
    for (const s of allSessions) {
      const code = s.country_code || 'XX'
      const existing = countryMap.get(code)
      if (existing) existing.count++
      else countryMap.set(code, { country: s.country || code, code, count: 1 })
    }
    const countries = topN([...countryMap.values()])

    // ── Devices ──────────────────────────────────────────────────────────────
    const deviceMap = new Map<string, number>()
    for (const s of allSessions) {
      const d = s.device_type || 'desktop'
      deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1)
    }
    const devices = [...deviceMap.entries()].map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)

    // ── Browsers ─────────────────────────────────────────────────────────────
    const browserMap = new Map<string, number>()
    for (const s of allSessions) {
      const b = s.browser || 'Autre'
      browserMap.set(b, (browserMap.get(b) ?? 0) + 1)
    }
    const browsers = topN([...browserMap.entries()].map(([browser, count]) => ({ browser, count })))

    // ── OS ───────────────────────────────────────────────────────────────────
    const osMap = new Map<string, number>()
    for (const s of allSessions) {
      const o = s.os || 'Autre'
      osMap.set(o, (osMap.get(o) ?? 0) + 1)
    }
    const osStats = topN([...osMap.entries()].map(([os, count]) => ({ os, count })))

    // ── Top pages ────────────────────────────────────────────────────────────
    const pageMap = new Map<string, number>()
    for (const pv of allPV) {
      const p = pv.page || '/'
      pageMap.set(p, (pageMap.get(p) ?? 0) + 1)
    }
    const topPages = topN([...pageMap.entries()].map(([page, count]) => ({ page, count })))

    // ── Referrers ────────────────────────────────────────────────────────────
    const refMap = new Map<string, number>()
    for (const s of allSessions) {
      const r = s.referrer_host || s.utm_source || 'Direct'
      refMap.set(r, (refMap.get(r) ?? 0) + 1)
    }
    const referrers = topN([...refMap.entries()].map(([source, count]) => ({ source, count })))

    // ── Traffic by UTM medium ────────────────────────────────────────────────
    const mediumMap = new Map<string, number>()
    for (const s of allSessions) {
      const m = s.utm_medium || (s.referrer_host ? 'referral' : 'direct')
      mediumMap.set(m, (mediumMap.get(m) ?? 0) + 1)
    }
    const trafficMediums = [...mediumMap.entries()].map(([medium, count]) => ({ medium, count }))
      .sort((a, b) => b.count - a.count)

    // ── Daily trend (sparkline data) ─────────────────────────────────────────
    const dailyMap = new Map<string, number>()
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      dailyMap.set(d.toISOString().slice(0, 10), 0)
    }
    for (const s of allSessions) {
      const day = s.first_seen.slice(0, 10)
      if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }
    const dailyTrend = [...dailyMap.entries()].map(([date, count]) => ({ date, count }))

    // ── Logged-in users enrichi (profiles) ──────────────────────────────────
    const loggedInEmails = [...new Set(
      allSessions.filter(s => s.user_email).map(s => s.user_email as string)
    )].slice(0, 50)

    let profiles: Record<string, unknown>[] = []
    if (loggedInEmails.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, company, gender, birth_year, created_at')
        .in('email', loggedInEmails)
      profiles = (data ?? []) as Record<string, unknown>[]
    }

    const profileMap: Record<string, Record<string, unknown>> = {}
    for (const p of profiles) profileMap[p.email as string] = p

    const recentLoggedIn = allSessions
      .filter(s => s.user_email)
      .slice(0, 20)
      .map(s => ({
        ...s,
        profile: profileMap[s.user_email!] ?? null,
      }))

    // ── Gender stats (from profiles of logged-in users) ───────────────────────
    const genderMap = new Map<string, number>()
    for (const p of profiles) {
      const g = (p.gender as string) || 'NS'
      genderMap.set(g, (genderMap.get(g) ?? 0) + 1)
    }
    const genderLabels: Record<string, string> = { M: 'Homme', F: 'Femme', NB: 'Non-binaire', NS: 'Non précisé' }
    const genderStats = [...genderMap.entries()].map(([g, count]) => ({
      gender: genderLabels[g] ?? g, code: g, count,
    }))

    // ── Age stats (from profiles) ─────────────────────────────────────────────
    const currentYear = new Date().getFullYear()
    const ageGroups = { '< 25': 0, '25–34': 0, '35–44': 0, '45–54': 0, '55–64': 0, '65+': 0, 'N/A': 0 }
    for (const p of profiles) {
      if (!p.birth_year) { ageGroups['N/A']++; continue }
      const age = currentYear - (p.birth_year as number)
      if      (age < 25)  ageGroups['< 25']++
      else if (age < 35)  ageGroups['25–34']++
      else if (age < 45)  ageGroups['35–44']++
      else if (age < 55)  ageGroups['45–54']++
      else if (age < 65)  ageGroups['55–64']++
      else                ageGroups['65+']++
    }
    const ageStats = Object.entries(ageGroups)
      .filter(([, c]) => c > 0)
      .map(([group, count]) => ({ group, count }))

    return NextResponse.json({
      range,
      overview: {
        totalSessions,
        totalPageviews:   totalPV,
        todaySessions:    todaySessions.length,
        uniqueLoggedIn:   uniqueUsers,
        loggedInSessions: loggedIn,
        bounceRate:       totalSessions ? Math.round((bounces / totalSessions) * 100) : 0,
        avgPagesPerSession: totalSessions ? Math.round((totalPV / totalSessions) * 10) / 10 : 0,
        activeNow:        activeSessions?.length ?? 0,
      },
      activeNow:    activeSessions ?? [],
      dailyTrend,
      countries,
      devices,
      browsers,
      osStats,
      topPages,
      referrers,
      trafficMediums,
      recentLoggedIn,
      demographics: { gender: genderStats, age: ageStats },
    })
  } catch (err) {
    console.error('[admin/analytics GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
