import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, generateFileKey } from '@/lib/r2/client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const itemId = formData.get('itemId') as string

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const MAX_SIZE = 500 * 1024 * 1024 // 500 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 500 MB)' }, { status: 400 })
    }

    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/tiff',
      'application/postscript',
      'application/illustrator',
    ]

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|tiff|ai|eps)$/i)) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez PDF, JPG, PNG, TIFF, AI ou EPS.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = generateFileKey(itemId || 'temp', file.name)
    const url = await uploadFile(key, buffer, file.type)

    return NextResponse.json({ url, key, name: file.name, size: file.size })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
  }
}

export const config = {
  api: { bodyParser: false },
}
