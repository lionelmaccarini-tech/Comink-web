import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompteClient from '@/components/compte/CompteClient'

export const metadata: Metadata = {
  title: 'Mon compte',
}

export default async function ComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .or(`user_id.eq.${user.id},client_email.ilike.${user.email!}`)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, reference, items, subtotal, tax, total, status, created_at, valid_until, vat_number, delivery_method, delivery_cost, delivery_address')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  return (
    <CompteClient
      user={user}
      profile={profile}
      orders={orders || []}
      quotes={quotes || []}
    />
  )
}
