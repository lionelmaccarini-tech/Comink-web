import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/r2/client'

export const runtime = 'nodejs'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const key = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFile(key, buffer, file.type)

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[blog/upload-image]', err)
    return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
  }
}
