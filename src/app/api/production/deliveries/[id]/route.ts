import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'
import { sendPickupConfirmation, sendFilesExpiryNotice } from '@/lib/resend/client'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireStaff()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const body = await req.json() as {
      action: 'pickup' | 'carrier' | 'in_transit' | 'delivered'
      signed_by?: string
      signature?: string
      carrier_name?: string
      tracking_number?: string
      note?: string
    }

    let patch: Record<string, unknown> = {}

    if (body.action === 'pickup') {
      if (!body.signed_by) {
        return NextResponse.json({ error: 'signed_by requis' }, { status: 400 })
      }
      patch = {
        delivery_status: 'picked_up',
        pickup_signed_by: body.signed_by,
        pickup_signature: body.signature ?? null,
        pickup_signed_at: new Date().toISOString(),
      }
    } else if (body.action === 'carrier') {
      if (!body.carrier_name) {
        return NextResponse.json({ error: 'carrier_name requis' }, { status: 400 })
      }
      patch = {
        delivery_status: 'handed_to_carrier',
        carrier_name: body.carrier_name,
        tracking_number: body.tracking_number ?? null,
        carrier_handoff_at: new Date().toISOString(),
        carrier_handoff_note: body.note ?? null,
      }
    } else if (body.action === 'in_transit') {
      patch = { delivery_status: 'in_transit' }
    } else if (body.action === 'delivered') {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 10)
      patch = { delivery_status: 'delivered', files_expire_at: expiresAt.toISOString() }
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select('id, order_number, client_name, client_email, delivery_method, delivery_status, delivery_cost, total, pickup_signed_by, pickup_signed_at, carrier_name, tracking_number, carrier_handoff_at, created_at')
      .single()

    if (error) throw error

    // Send pickup confirmation email
    if (body.action === 'pickup' && updated) {
      try {
        await sendPickupConfirmation(
          updated.client_email,
          updated.order_number,
          body.signed_by!,
          body.signature ?? '',
          `Commande #${updated.order_number}`
        )
      } catch (emailErr) {
        console.error('[deliveries PATCH] sendPickupConfirmation error', emailErr)
      }
    }

    // Set files_expire_at for pickup (separate update since pickup patch uses different fields)
    if (body.action === 'pickup' && updated) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 10)
      try {
        const supabaseService = await createServiceClient()
        await supabaseService
          .from('orders')
          .update({ files_expire_at: expiresAt.toISOString() })
          .eq('id', id)
      } catch (updateErr) {
        console.error('[deliveries PATCH] files_expire_at update error', updateErr)
      }
    }

    // Send files expiry notice for pickup or delivered
    if ((body.action === 'pickup' || body.action === 'delivered') && updated) {
      try {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 10)
        const supabaseService = await createServiceClient()
        const { data: lines } = await supabaseService
          .from('production_lines')
          .select('file_url, file_name')
          .eq('order_id', id)
          .not('file_url', 'is', null)
        const fileLinks = (lines ?? [])
          .filter((l: { file_url: string | null; file_name: string | null }) => l.file_url)
          .map((l: { file_url: string | null; file_name: string | null }) => ({
            name: l.file_name || l.file_url!,
            url: l.file_url!,
          }))
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comink.be'
        await sendFilesExpiryNotice(
          updated.client_email,
          updated.order_number,
          expiresAt,
          fileLinks,
          siteUrl,
        )
      } catch (emailErr) {
        console.error('[deliveries PATCH] sendFilesExpiryNotice error', emailErr)
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[production/deliveries/[id] PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
