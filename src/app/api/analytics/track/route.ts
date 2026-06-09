import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// ── User-Agent parser (no external lib) ──────────────────────────────────────
function parseUA(ua: string): { device: string; browser: string; browserVer: string; os: string; osVer: string; isBot: boolean } {
  const u = ua || ''

  // Bots
  const botRx = /bot|crawler|spider|scraper|googlebot|bingbot|slurp|duckduck|yandex|baidu|sogou|facebookexternalhit|semrush|ahrefs|mj12bot|dotbot|rogerbot|exabot|ia_archiver/i
  if (botRx.test(u)) return { device: 'bot', browser: 'Bot', browserVer: '', os: 'Bot', osVer: '', isBot: true }

  // Device
  const isMobile  = /mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(u)
  const isTablet  = /tablet|ipad|android(?!.*mobile)/i.test(u)
  const device    = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  // Browser
  let browser = 'Autre', browserVer = ''
  const bMap: [RegExp, string][] = [
    [/Edg\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/SamsungBrowser\/([\d.]+)/, 'Samsung'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Safari\/([\d.]+)/, 'Safari'],
    [/MSIE ([\d.]+)/, 'IE'],
    [/Trident\/.*rv:([\d.]+)/, 'IE'],
  ]
  for (const [rx, name] of bMap) {
    const m = u.match(rx)
    if (m) { browser = name; browserVer = m[1].split('.')[0]; break }
  }
  // Fix Safari (Chrome UA contains "Safari" too)
  if (browser === 'Safari' && u.includes('Chrome')) browser = 'Chrome'

  // OS
  let os = 'Autre', osVer = ''
  const osMap: [RegExp, string][] = [
    [/Windows NT ([\d.]+)/, 'Windows'],
    [/Mac OS X ([\d_]+)/,   'macOS'],
    [/iPhone OS ([\d_]+)/,  'iOS'],
    [/iPad.*OS ([\d_]+)/,   'iPadOS'],
    [/Android ([\d.]+)/,    'Android'],
    [/Linux/,               'Linux'],
    [/CrOS/,                'ChromeOS'],
  ]
  for (const [rx, name] of osMap) {
    const m = u.match(rx)
    if (m) {
      os    = name
      osVer = (m[1] || '').replace(/_/g, '.').split('.').slice(0, 2).join('.')
      break
    }
  }
  // Windows NT version map
  if (os === 'Windows') {
    const ntMap: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista' }
    osVer = ntMap[osVer] || osVer
  }

  return { device, browser, browserVer, os, osVer, isBot: false }
}

function extractHost(ref: string | null): string | null {
  if (!ref) return null
  try { return new URL(ref).hostname.replace(/^www\./, '') } catch { return null }
}

function extractUTM(search: string, key: string): string | null {
  try { return new URLSearchParams(search).get(key) } catch { return null }
}

// ── POST /api/analytics/track ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      session_id: string
      page:       string
      title?:     string
      referrer?:  string | null
      user_id?:   string | null
      user_email?: string | null
    }

    const { session_id, page, title, referrer, user_id, user_email } = body
    if (!session_id || !page) return NextResponse.json({ ok: false }, { status: 400 })

    // ── Geo (Vercel headers — free, no API key needed) ──────────────────────
    const country      = req.headers.get('x-vercel-ip-country')        ?? null
    const countryCode  = req.headers.get('x-vercel-ip-country')        ?? null
    const city         = req.headers.get('x-vercel-ip-city')           ?? null
    const region       = req.headers.get('x-vercel-ip-country-region') ?? null
    const latStr       = req.headers.get('x-vercel-ip-latitude')       ?? null
    const lonStr       = req.headers.get('x-vercel-ip-longitude')      ?? null
    const latitude     = latStr  ? parseFloat(latStr)  : null
    const longitude    = lonStr  ? parseFloat(lonStr)  : null

    // Country code → name map (les plus fréquents)
    const countryNames: Record<string, string> = {
      BE:'Belgique', FR:'France', LU:'Luxembourg', NL:'Pays-Bas', DE:'Allemagne',
      GB:'Royaume-Uni', CH:'Suisse', IT:'Italie', ES:'Espagne', US:'États-Unis',
      CA:'Canada', MA:'Maroc', TN:'Tunisie', DZ:'Algérie', SN:'Sénégal',
      PT:'Portugal', AU:'Australie', JP:'Japon', BR:'Brésil', MX:'Mexique',
    }
    const countryName = country ? (countryNames[country] ?? country) : null

    // ── UA parsing ───────────────────────────────────────────────────────────
    const ua     = req.headers.get('user-agent') ?? ''
    const parsed = parseUA(ua)
    if (parsed.isBot) return NextResponse.json({ ok: true }) // silently drop bots

    // ── UTM params (from page URL) ────────────────────────────────────────────
    const urlObj     = (() => { try { return new URL(page, 'https://comink.be') } catch { return null } })()
    const utmSource  = urlObj ? extractUTM(urlObj.search, 'utm_source')   : null
    const utmMedium  = urlObj ? extractUTM(urlObj.search, 'utm_medium')   : null
    const utmCampaign = urlObj ? extractUTM(urlObj.search, 'utm_campaign') : null
    const pagePath   = urlObj ? urlObj.pathname : page

    const supabase = await createServiceClient()

    // ── Upsert session ───────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('analytics_sessions')
      .select('id, page_count, user_id')
      .eq('session_id', session_id)
      .single()

    if (existing) {
      await supabase.from('analytics_sessions').update({
        last_seen:  new Date().toISOString(),
        page_count: (existing.page_count ?? 1) + 1,
        user_id:    user_id || existing.user_id || null,
        user_email: user_email || null,
      }).eq('session_id', session_id)
    } else {
      await supabase.from('analytics_sessions').insert({
        session_id,
        user_id:      user_id || null,
        user_email:   user_email || null,
        country:      countryName,
        country_code: countryCode,
        city,
        region,
        latitude,
        longitude,
        device_type:  parsed.device,
        browser:      parsed.browser,
        browser_ver:  parsed.browserVer,
        os:           parsed.os,
        os_ver:       parsed.osVer,
        referrer:     referrer || null,
        referrer_host: extractHost(referrer || null),
        utm_source:   utmSource,
        utm_medium:   utmMedium,
        utm_campaign: utmCampaign,
        landing_page: pagePath,
        is_bot:       false,
      })
    }

    // ── Insert page view ─────────────────────────────────────────────────────
    await supabase.from('analytics_pageviews').insert({
      session_id,
      user_id:    user_id || null,
      page:       pagePath,
      title:      title  || null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[analytics/track]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
