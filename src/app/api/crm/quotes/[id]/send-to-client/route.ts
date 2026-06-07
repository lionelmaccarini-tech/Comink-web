import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendQuoteToClientEmail } from '@/lib/email/resend'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

/**
 * POST /api/crm/quotes/[id]/send-to-client
 * 1. Génère un public_token UUID si absent
 * 2. Envoie un email au client avec lien de validation
 * 3. Met à jour pipeline_stage = 'quoted', log activité CRM
 * 4. Retourne { success: true, public_token }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { sent_by } = await req.json().catch(() => ({}))
    const supabase = await createServiceClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }
    if (!quote.client_email) {
      return NextResponse.json({ error: 'Email client manquant' }, { status: 400 })
    }

    // Générer un public_token si absent
    let publicToken: string = quote.public_token
    if (!publicToken) {
      publicToken = randomUUID()
      await supabase
        .from('quotes')
        .update({ public_token: publicToken })
        .eq('id', id)
    }

    // Envoyer l'email
    await sendQuoteToClientEmail({
      id,
      quote_number: quote.quote_number,
      client_name: quote.client_name,
      client_email: quote.client_email,
      total: quote.total ?? 0,
      public_token: publicToken,
    })

    // Mettre à jour le pipeline + status
    await supabase
      .from('quotes')
      .update({
        pipeline_stage: 'quoted',
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    // Logger l'activité CRM
    await supabase.from('crm_activities').insert({
      quote_id: id,
      type: 'email',
      content: `Devis envoyé au client par email (${quote.client_email})`,
      old_stage: quote.pipeline_stage,
      new_stage: 'quoted',
      created_by: sent_by || null,
    })

    return NextResponse.json({ success: true, public_token: publicToken })
  } catch (err: any) {
    console.error('[crm/quotes/send-to-client POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur lors de l\'envoi' }, { status: 500 })
  }
}
