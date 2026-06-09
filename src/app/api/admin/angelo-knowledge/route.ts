import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET /api/admin/angelo-knowledge — liste toutes les entrées (admin)
export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('angelo_knowledge')
      .select('*')
      .order('category')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[admin/angelo-knowledge GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/angelo-knowledge — créer une nouvelle entrée
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, question, answer, keywords, source, source_ref } = body
    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ error: 'question et answer sont requis' }, { status: 400 })
    }
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('angelo_knowledge')
      .insert({
        category:   category || 'general',
        question:   question.trim(),
        answer:     answer.trim(),
        keywords:   Array.isArray(keywords) ? keywords : [],
        source:     source || 'manual',
        source_ref: source_ref || null,
        approved:   true,
        is_active:  true,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/angelo-knowledge POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
