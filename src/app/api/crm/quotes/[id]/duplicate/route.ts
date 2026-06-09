import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateQuoteNumber } from '@/lib/utils'

export const runtime = 'nodejs'

/**
 * POST /api/crm/quotes/[id]/duplicate
 * Body (optionnel) :
 *   client_name, client_email, client_company, client_phone, vat_number,
 *   billing_line1…billing_country, user_id
 *   → si absent : reprend le client du devis source
 *
 * Crée un nouveau devis (statut draft, stage lead) avec les mêmes lignes,
 * prix, livraison, notes que le devis source.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const supabase = await createServiceClient()

    // Récupérer le devis source
    const { data: src, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !src) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    // Client : override ou copie du source
    const clientName    = body.client_name    ?? src.client_name
    const clientEmail   = body.client_email   ?? src.client_email
    const clientCompany = body.client_company ?? src.client_company ?? null
    const clientPhone   = body.client_phone   ?? src.client_phone   ?? null
    const vatNumber     = body.vat_number     ?? src.vat_number     ?? null
    const userId        = body.user_id        ?? src.user_id        ?? null

    // Adresse de facturation
    const billingLine1      = body.billing_line1      ?? src.billing_line1      ?? null
    const billingLine2      = body.billing_line2      ?? src.billing_line2      ?? null
    const billingCity       = body.billing_city       ?? src.billing_city       ?? null
    const billingPostalCode = body.billing_postal_code ?? src.billing_postal_code ?? null
    const billingCountry    = body.billing_country    ?? src.billing_country    ?? null

    const quoteNumber = generateQuoteNumber()

    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        quote_number:     quoteNumber,
        client_name:      clientName,
        client_email:     clientEmail,
        client_company:   clientCompany,
        client_phone:     clientPhone,
        vat_number:       vatNumber,
        user_id:          userId,
        billing_line1:    billingLine1,
        billing_line2:    billingLine2,
        billing_city:     billingCity,
        billing_postal_code: billingPostalCode,
        billing_country:  billingCountry,
        // Reprendre exactement le contenu du devis
        items:            src.items,
        subtotal:         src.subtotal,
        tax:              src.tax,
        total:            src.total,
        notes:            src.notes,
        reference:        src.reference ? `Copie de ${src.reference || src.quote_number}` : `Copie de ${src.quote_number}`,
        valid_until:      null,  // à redéfinir
        delivery_method:  src.delivery_method,
        delivery_cost:    src.delivery_cost,
        delivery_country: src.delivery_country,
        delivery_address: src.delivery_address,
        delivery_km:      src.delivery_km,
        blind_shipping:   src.blind_shipping,
        // Pipeline : repart de zéro
        status:           'draft',
        pipeline_stage:   'lead',
        probability:      src.probability ?? 20,
        expected_amount:  src.total,
        source:           src.source,
        assigned_to:      src.assigned_to ?? null,
        created_by:       body.created_by ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Activité CRM
    await supabase.from('crm_activities').insert({
      quote_id:   newQuote.id,
      type:       'status_change',
      content:    `Devis dupliqué depuis #${src.quote_number}`,
      new_stage:  'lead',
      created_by: body.created_by ?? null,
    })

    return NextResponse.json({ id: newQuote.id, quote_number: newQuote.quote_number }, { status: 201 })
  } catch (err: any) {
    console.error('[crm/quotes/duplicate POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 })
  }
}
