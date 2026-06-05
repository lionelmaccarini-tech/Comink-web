import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl, generateFileKey } from '@/lib/r2/client'

export const runtime = 'nodejs'

// POST /api/r2-presign — génère une URL signée pour upload direct browser→R2
export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType, itemId } = await req.json()
    if (!fileName) return NextResponse.json({ error: 'fileName requis' }, { status: 400 })

    const key = generateFileKey(itemId || 'upload', fileName)
    const presignedUrl = await getPresignedUploadUrl(key, contentType || 'application/octet-stream', 3600)
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return NextResponse.json({ presignedUrl, publicUrl, key, name: fileName })
  } catch (err: any) {
    console.error('[r2-presign]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
