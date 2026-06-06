import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET — charger un article complet (admin)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — mettre à jour un article
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = await createServiceClient()
    const now = new Date().toISOString()

    const patch: Record<string, any> = { updated_at: now }
    const allowed = ['title', 'excerpt', 'content', 'cover_image', 'tags', 'published',
      'published_at', 'seo_title', 'seo_description', 'seo_keywords', 'reading_time_min', 'author_name']
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }
    if (patch.published === true && !patch.published_at) {
      patch.published_at = now
    }
    if (patch.published === false) {
      patch.published_at = null
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — supprimer un article
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
