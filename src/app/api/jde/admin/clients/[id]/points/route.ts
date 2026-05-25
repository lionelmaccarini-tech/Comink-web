import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/requireStaff'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await requireStaff()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { amount, description, type } = body

  if (!amount || !type || !['credit', 'debit', 'purchase'].includes(type)) {
    return NextResponse.json({ error: 'Paramètres invalides (amount, type requis)' }, { status: 400 })
  }

  // Get current client
  const { data: client, error: fetchError } = await supabase
    .from('jde_clients')
    .select('id, points_balance, full_name')
    .eq('id', id)
    .single()

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  }

  const delta = type === 'credit' ? Math.abs(amount) : -Math.abs(amount)
  const newBalance = client.points_balance + delta

  if (newBalance < 0) {
    return NextResponse.json({ error: 'Solde insuffisant pour ce débit' }, { status: 400 })
  }

  // Update balance
  const { error: updateError } = await supabase
    .from('jde_clients')
    .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Erreur mise à jour solde' }, { status: 500 })
  }

  // Record transaction
  const { data: tx, error: txError } = await supabase
    .from('jde_point_transactions')
    .insert({
      client_id: id,
      type,
      amount: Math.abs(amount),
      description: description ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (txError) {
    console.error('[jde/admin/clients/[id]/points POST]', txError)
  }

  return NextResponse.json({ new_balance: newBalance, transaction: tx })
}
