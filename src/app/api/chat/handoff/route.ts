import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateQuoteNumber } from '@/lib/utils'

export const runtime = 'nodejs'

/**
 * POST /api/chat/handoff
 * Crée un lead CRM depuis une conversation Angelo pour suivi humain.
 * Accessible sans auth (visitors du site peuvent l'appeler).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      visitorName,
      visitorEmail,
      visitorPhone,
      extraNote,
      messages,       // [{ role: 'user'|'assistant', text: string }]
    } = body

    if (!visitorName && !visitorEmail) {
      return NextResponse.json({ error: 'Coordonnées manquantes' }, { status: 400 })
    }

    // ── Formater la transcription ───────────────────────────────────────────
    const transcript = (messages as { role: string; text: string }[])
      .filter(m => m.text && m.text.trim())
      .map(m => {
        const label = m.role === 'user' ? `👤 ${visitorName || 'Visiteur'}` : '🤖 Angelo'
        return `${label} :\n${m.text.trim()}`
      })
      .join('\n\n')

    const notes = [
      '=== Conversation Angelo → Prise en charge humaine ===',
      '',
      extraNote ? `📝 Message du client : ${extraNote}` : null,
      '',
      transcript,
    ]
      .filter(l => l !== null)
      .join('\n')

    // ── Créer le lead CRM ──────────────────────────────────────────────────
    const supabase = createAdminClient()
    const quote_number = generateQuoteNumber()

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_number,
        client_name:      visitorName  || 'Visiteur anonyme',
        client_email:     visitorEmail || '',
        client_phone:     visitorPhone || null,
        pipeline_stage:   'lead',
        status:           'draft',
        source:           'chat_angelo',
        notes,
        items:            [],
        subtotal:         0,
        tax:              0,
        total:            0,
        probability:      20,
        delivery_method:  'pickup',
        delivery_cost:    0,
        delivery_country: 'BE',
        blind_shipping:   false,
      })
      .select('id, quote_number')
      .single()

    if (error) {
      console.error('[chat/handoff] insert error:', error)
      return NextResponse.json({ error: 'Erreur création CRM' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, quote_number: data.quote_number })
  } catch (err) {
    console.error('[chat/handoff]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
