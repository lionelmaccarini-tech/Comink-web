import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const productId = searchParams.get('product_id')
  const logoUrl = searchParams.get('logo_url')

  if (!productId || !logoUrl) return new NextResponse(null, { status: 400 })

  const supabase = await createServiceClient()
  const { data: product } = await supabase
    .from('jde_products')
    .select('template_url, logo_zone')
    .eq('id', productId)
    .single()

  if (!product?.template_url) return new NextResponse(null, { status: 404 })

  try {
    const [templateRes, logoRes] = await Promise.all([
      fetch(product.template_url),
      fetch(logoUrl),
    ])

    if (!templateRes.ok || !logoRes.ok) {
      return new NextResponse(null, { status: 502 })
    }

    const templateBuffer = Buffer.from(await templateRes.arrayBuffer())
    const logoBuffer = Buffer.from(await logoRes.arrayBuffer())

    const templateMeta = await sharp(templateBuffer).metadata()
    const { width: tw = 1000, height: th = 1000 } = templateMeta

    const zone = product.logo_zone as { x: number; y: number; width: number; height: number }
    const left = Math.round(zone.x * tw)
    const top = Math.round(zone.y * th)
    const logoW = Math.round(zone.width * tw)
    const logoH = Math.round(zone.height * th)

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoW, logoH, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const result = await sharp(templateBuffer)
      .composite([{ input: resizedLogo, top, left }])
      .jpeg({ quality: 85 })
      .toBuffer()

    return new NextResponse(result as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    console.error('[jde/preview] error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
