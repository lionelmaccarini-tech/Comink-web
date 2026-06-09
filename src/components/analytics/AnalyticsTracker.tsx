'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Chemins à ne PAS tracker (backoffice)
const SKIP = ['/admin', '/crm', '/production', '/jde', '/api']

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('_comink_sid')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('_comink_sid', id)
    }
    return id
  } catch {
    return 'no-session'
  }
}

export default function AnalyticsTracker() {
  const pathname    = usePathname()
  const lastPath    = useRef<string>('')
  const userRef     = useRef<{ id: string | null; email: string | null }>({ id: null, email: null })

  // Récupérer le user une seule fois
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      userRef.current = {
        id:    session?.user?.id    ?? null,
        email: session?.user?.email ?? null,
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pathname) return
    if (SKIP.some(p => pathname.startsWith(p))) return
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    const sessionId = getSessionId()

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        page:       pathname,
        title:      document.title || undefined,
        referrer:   lastPath.current ? undefined : (document.referrer || null),
        user_id:    userRef.current.id,
        user_email: userRef.current.email,
      }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
