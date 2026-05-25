import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()
  const { data: client, error } = await service
    .from('jde_clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !client) {
    return NextResponse.json({ client: null }, { status: 200 })
  }

  return NextResponse.json({ client })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const allowed = ['logo_url', 'logo_name']
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
  }

  updates['updated_at'] = new Date().toISOString()

  const service = await createServiceClient()
  const { data, error } = await service
    .from('jde_clients')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[jde/clients/me PATCH]', error)
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }

  return NextResponse.json({ client: data })
}
