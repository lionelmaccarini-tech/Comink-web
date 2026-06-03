import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  if (q.length < 2) return NextResponse.json([])
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('client_accounts')
    .select('id, name, email, phone, vat_number')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .eq('is_active', true)
    .limit(8)
  return NextResponse.json(data ?? [])
}
