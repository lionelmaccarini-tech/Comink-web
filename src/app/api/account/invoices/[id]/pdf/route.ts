import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/account/invoices/[id]/pdf
 * Génère et retourne le PDF d'une facture Odoo.
 * Authentification requise (espace client).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const invoiceId = parseInt(id, 10)
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'ID de facture invalide' }, { status: 400 })
    }

    const odooUrl = process.env.ODOO_URL?.replace(/\/$/, '')
    const odooDb = process.env.ODOO_DB
    const odooUser = process.env.ODOO_USERNAME
    const odooApiKey = process.env.ODOO_API_KEY

    if (!odooUrl || !odooDb || !odooUser || !odooApiKey) {
      return NextResponse.json({ error: 'Odoo non configuré' }, { status: 503 })
    }

    // Authentification Odoo
    const authRes = await fetch(`${odooUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: {
          service: 'common',
          method: 'authenticate',
          args: [odooDb, odooUser, odooApiKey, {}],
        },
      }),
    })
    const authData = await authRes.json() as { result?: number; error?: unknown }
    const uid = authData.result
    if (!uid) {
      return NextResponse.json({ error: 'Authentification Odoo échouée' }, { status: 502 })
    }

    // Vérifier que la facture appartient bien au client connecté (par email)
    const checkRes = await fetch(`${odooUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 2,
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            odooDb, uid, odooApiKey,
            'account.move', 'search_read',
            [[
              ['id', '=', invoiceId],
              ['partner_id.email', '=ilike', user.email],
              ['move_type', '=', 'out_invoice'],
            ]],
            { fields: ['id', 'name'], limit: 1 },
          ],
        },
      }),
    })
    const checkData = await checkRes.json() as { result?: Array<{ id: number; name: string }> }
    if (!checkData.result || checkData.result.length === 0) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const invoiceName = checkData.result[0].name || `facture-${invoiceId}`

    // Télécharger le PDF via le rapport Odoo
    const reportUrl = `${odooUrl}/report/pdf/account.report_invoice/${invoiceId}`
    const pdfRes = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        // Auth HTTP Basic avec l'API key Odoo
        'Authorization': 'Basic ' + Buffer.from(`${odooUser}:${odooApiKey}`).toString('base64'),
      },
    })

    if (!pdfRes.ok) {
      // Fallback : utiliser l'endpoint /web/binary/render_report
      const fallbackRes = await fetch(`${odooUrl}/web/binary/download_document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${odooUser}:${odooApiKey}`).toString('base64'),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.move',
            id: invoiceId,
            report_name: 'account.report_invoice',
          },
        }),
      })

      if (!fallbackRes.ok) {
        return NextResponse.json(
          { error: 'Impossible de générer le PDF. Veuillez contacter Comink.' },
          { status: 502 },
        )
      }

      const pdfBuffer = await fallbackRes.arrayBuffer()
      const safeName = invoiceName.replace(/[^a-zA-Z0-9_-]/g, '_')
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
          'Cache-Control': 'private, max-age=300',
        },
      })
    }

    const pdfBuffer = await pdfRes.arrayBuffer()
    const safeName = invoiceName.replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    console.error('[account/invoices/pdf GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
