import { NextRequest, NextResponse } from 'next/server'

const JDE_HOSTS = [
  'printmyjde.be',
  'www.printmyjde.be',
  'jde.comink.be',       // sous-domaine de test
]

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''

  // ── Transmettre le pathname comme REQUEST header ──────────────────────────────
  // headers() dans un Server Component lit les request headers, pas les response headers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', req.nextUrl.pathname)
  const res = NextResponse.next({ request: { headers: requestHeaders } })

  // ── Domaine JDE → réécriture vers /jde/* ─────────────────────────────────────
  const isJDEHost = JDE_HOSTS.some(h => hostname === h || hostname.startsWith(h + ':'))
  if (isJDEHost) {
    const url = req.nextUrl.clone()
    if (
      !url.pathname.startsWith('/jde') &&
      !url.pathname.startsWith('/api') &&
      !url.pathname.startsWith('/_next')
    ) {
      url.pathname = url.pathname === '/' ? '/jde' : `/jde${url.pathname}`
      const rewriteHeaders = new Headers(req.headers)
      rewriteHeaders.set('x-pathname', url.pathname)
      return NextResponse.rewrite(url, { request: { headers: rewriteHeaders } })
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
