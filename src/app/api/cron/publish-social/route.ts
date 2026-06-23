import { NextRequest, NextResponse } from 'next/server'

// Cron Vercel → appelle l'endpoint de publication toutes les 15 minutes
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.eu'

  const res = await fetch(`${siteUrl}/api/admin/social/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
