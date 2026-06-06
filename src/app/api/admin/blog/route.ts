import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// GET — liste tous les articles (admin)
export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, published, published_at, tags, created_at, reading_time_min')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — créer un article
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createServiceClient()

    // Générer le slug depuis le titre
    const baseSlug = slugify(body.title || 'article')
    let slug = baseSlug
    let attempt = 0
    while (attempt < 10) {
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const now = new Date().toISOString()
    const payload = {
      title:           body.title?.trim() || 'Sans titre',
      slug,
      excerpt:         body.excerpt?.trim() || null,
      content:         body.content || null,
      cover_image:     body.cover_image || null,
      tags:            body.tags ?? [],
      published:       body.published ?? false,
      published_at:    body.published ? (body.published_at || now) : null,
      seo_title:       body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      seo_keywords:    body.seo_keywords?.trim() || null,
      reading_time_min: body.reading_time_min ?? null,
      author_name:     body.author_name?.trim() || 'Équipe Comink',
      updated_at:      now,
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
