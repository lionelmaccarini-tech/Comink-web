import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Returns all users who can be assigned to a quote (admin, collaborateur, vendeur)
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'collaborateur', 'vendeur'])
      .order('full_name')

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[crm/vendeurs GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
