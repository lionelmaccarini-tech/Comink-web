import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * GET /api/test-email?to=xxx@xxx.com
 * Endpoint de diagnostic — envoie un email test et retourne la réponse Resend brute.
 * À supprimer après diagnostic.
 */
export async function GET(req: NextRequest) {
  const to = new URL(req.url).searchParams.get('to') || 'info@comink.be'

  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL || 'noreply@comink.be'

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY non défini dans les variables d\'environnement' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const result = await resend.emails.send({
    from,
    to,
    subject: 'Comink — Test email',
    html: '<p>Ceci est un email de test envoyé depuis l\'API Comink.</p>',
  })

  // Retourner la réponse brute pour diagnostic
  return NextResponse.json({
    config: { from, to, apiKeyPrefix: apiKey.slice(0, 8) + '...' },
    resend_response: result,
  })
}
