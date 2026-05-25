import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/r2/client'

export const runtime = 'nodejs'

interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  point_cost_each: number
}

async function generateVisual(
  templateUrl: string,
  logoUrl: string,
  logoZone: { x: number; y: number; width: number; height: number }
): Promise<Buffer | null> {
  try {
    const [templateRes, logoRes] = await Promise.all([
      fetch(templateUrl),
      fetch(logoUrl),
    ])
    if (!templateRes.ok || !logoRes.ok) return null

    const templateBuffer = Buffer.from(await templateRes.arrayBuffer())
    const logoBuffer = Buffer.from(await logoRes.arrayBuffer())

    const meta = await sharp(templateBuffer).metadata()
    const tw = meta.width ?? 1000
    const th = meta.height ?? 1000

    const left = Math.round(logoZone.x * tw)
    const top = Math.round(logoZone.y * th)
    const logoW = Math.round(logoZone.width * tw)
    const logoH = Math.round(logoZone.height * th)

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoW, logoH, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    return await sharp(templateBuffer)
      .composite([{ input: resizedLogo, top, left }])
      .jpeg({ quality: 90 })
      .toBuffer()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()

  // Get JDE client
  const { data: jdeClient } = await service
    .from('jde_clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!jdeClient || !jdeClient.is_active) {
    return NextResponse.json({ error: 'Client JDE introuvable ou inactif' }, { status: 403 })
  }

  const body = await req.json()
  const items: CartItem[] = body.items ?? []

  if (!items.length) {
    return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
  }

  // Calculate total
  const totalPoints = items.reduce((sum, item) => sum + item.point_cost_each * item.quantity, 0)

  if (jdeClient.points_balance < totalPoints) {
    return NextResponse.json({ error: 'Solde de points insuffisant' }, { status: 400 })
  }

  // Get initial production status
  const { data: initialStatus } = await service
    .from('production_statuses')
    .select('id')
    .eq('is_initial', true)
    .single()

  // Generate order number
  const orderNumber = `JDE-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

  // Create order
  const { data: order, error: orderError } = await service
    .from('jde_orders')
    .insert({
      order_number: orderNumber,
      client_id: jdeClient.id,
      total_points: totalPoints,
      status: 'pending',
      notes: `Commande passée le ${new Date().toLocaleDateString('fr-BE')}`,
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('[jde/orders POST] order creation error:', orderError)
    return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })
  }

  // Fetch product details for each item
  const productIds = [...new Set(items.map(i => i.product_id))]
  const { data: products } = await service
    .from('jde_products')
    .select('id, name, template_url, logo_zone')
    .in('id', productIds)

  const productMap = new Map(products?.map(p => [p.id, p]) ?? [])

  // Create order items + generate visuals + create production lines
  const createdItems = []
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const product = productMap.get(item.product_id)

    let generatedVisualUrl: string | null = null

    // Generate visual if template + logo available
    if (product?.template_url && jdeClient.logo_url) {
      const logoZone = (product.logo_zone as { x: number; y: number; width: number; height: number }) ?? {
        x: 0.1, y: 0.1, width: 0.3, height: 0.3,
      }
      const visualBuffer = await generateVisual(product.template_url, jdeClient.logo_url, logoZone)
      if (visualBuffer) {
        const key = `jde/visuals/${order.id}/${idx}_${item.product_name.replace(/[^a-z0-9]/gi, '_')}.jpg`
        try {
          generatedVisualUrl = await uploadFile(key, visualBuffer, 'image/jpeg')
        } catch (e) {
          console.error('[jde/orders] visual upload error:', e)
        }
      }
    }

    // Create production line
    let productionLineId: string | null = null
    if (initialStatus) {
      const { data: prodLine } = await service
        .from('production_lines')
        .insert({
          order_number: `JDE-${orderNumber}`,
          user_id: null,
          client_name: jdeClient.full_name,
          client_email: jdeClient.email,
          product_name: item.product_name,
          file_url: generatedVisualUrl,
          file_name: generatedVisualUrl ? `JDE-${item.product_name}.jpg` : null,
          status_id: initialStatus.id,
          notes: `Commande JDE #${orderNumber}`,
          sort_order: idx,
        })
        .select('id')
        .single()
      productionLineId = prodLine?.id ?? null
    }

    // Create order item
    const { data: orderItem } = await service
      .from('jde_order_items')
      .insert({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        point_cost_each: item.point_cost_each,
        logo_url: jdeClient.logo_url,
        generated_visual_url: generatedVisualUrl,
        production_line_id: productionLineId,
      })
      .select()
      .single()

    if (orderItem) createdItems.push(orderItem)
  }

  // Deduct points
  await service
    .from('jde_clients')
    .update({
      points_balance: jdeClient.points_balance - totalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jdeClient.id)

  // Record transaction
  await service
    .from('jde_point_transactions')
    .insert({
      client_id: jdeClient.id,
      type: 'debit',
      amount: totalPoints,
      description: `Commande ${orderNumber}`,
      reference_id: order.id,
      created_by: user.id,
    })

  return NextResponse.json({
    order: { ...order, jde_order_items: createdItems },
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()

  const { data: jdeClient } = await service
    .from('jde_clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!jdeClient) return NextResponse.json({ orders: [] })

  const { data: orders } = await service
    .from('jde_orders')
    .select('*, jde_order_items(*)')
    .eq('client_id', jdeClient.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ orders: orders ?? [] })
}
