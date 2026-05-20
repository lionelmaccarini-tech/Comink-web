import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ALMA_API_KEY) {
      return NextResponse.json({ error: 'Alma non configuré' }, { status: 400 })
    }

    const {
      items: _items,
      vatNumber: _vatNumber,
      orderReference,
      billing,
      shipping: _shipping,
      delivery_method: _delivery_method,
      delivery_cost: _delivery_cost,
      total_ttc,
    } = await req.json()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const firstName = billing?.name?.split(' ')[0] || billing?.name || ''
    const lastName  = billing?.name?.split(' ').slice(1).join(' ') || ''

    const body = {
      payment: {
        purchase_amount:   Math.round(total_ttc * 100),
        return_url:        `${siteUrl}/commande/confirmation?type=alma&session_id={checkout_token}`,
        ipn_callback_url:  `${siteUrl}/api/alma/webhook`,
        installments_count: 3,
      },
      customer: {
        first_name: firstName,
        last_name:  lastName,
        email:      '',
        addresses: [{
          line1:       billing?.line1       || '',
          city:        billing?.city        || '',
          postal_code: billing?.postal_code || '',
          country:     billing?.country     || 'BE',
        }],
      },
      orders: [{
        merchant_reference: orderReference || 'CMD',
        merchant_url:       siteUrl,
      }],
    }

    const res = await fetch('https://api.getalma.eu/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Alma-Auth ${process.env.ALMA_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[alma create-checkout] API error:', data)
      return NextResponse.json({ error: data?.message || 'Erreur Alma' }, { status: res.status })
    }

    return NextResponse.json({ url: data?.payment?.url || data?.url })
  } catch (err) {
    console.error('[alma/create-checkout POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
