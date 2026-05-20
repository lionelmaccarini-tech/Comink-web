import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error) throw error

    const s: Record<string, string> = {}
    for (const row of data ?? []) s[row.key] = row.value

    const get = (key: string, def: string) => s[key] ?? def

    return NextResponse.json({
      payment: {
        card:             get('payment_card_enabled', 'true') === 'true',
        alma:             get('payment_alma_enabled', 'true') === 'true',
        wire:             get('payment_wire_enabled', 'true') === 'true',
        wire_iban:        get('payment_wire_iban', ''),
        wire_bic:         get('payment_wire_bic', ''),
        wire_beneficiary: get('payment_wire_beneficiary', 'Comink SRL'),
        default_deadline_days: Number(get('payment_default_deadline_days', '0')),
      },
      delivery: {
        pickup:         get('delivery_pickup_enabled', 'true') === 'true',
        parcel:         get('delivery_parcel_enabled', 'true') === 'true',
        express:        get('delivery_express_enabled', 'true') === 'true',
        parcel_be_min:  Number(get('delivery_parcel_be_min', '25')),
        parcel_eu_min:  Number(get('delivery_parcel_eu_min', '50')),
        parcel_percent: Number(get('delivery_parcel_percent', '4')),
        express_min:    Number(get('delivery_express_min', '100')),
        express_per_km: Number(get('delivery_express_per_km', '3.5')),
        atelier_address: get('delivery_atelier_address', ''),
      },
    })
  } catch (err) {
    console.error('[settings/payment-delivery GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
