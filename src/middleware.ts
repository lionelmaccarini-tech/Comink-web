import { NextRequest, NextResponse } from 'next/server'

const JDE_HOSTS = [
  'printmyjde.be',
  'www.printmyjde.be',
  'jde.comink.be',       // sous-domaine de test
]

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const res = NextResponse.next()

  // ── Toujours transmettre le pathname pour que le root layout le lise ─────────
  res.headers.set('x-pathname', req.nextUrl.pathname)

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
      const rewrite = NextResponse.rewrite(url)
      rewrite.headers.set('x-pathname', url.pathname)
      return rewrite
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
