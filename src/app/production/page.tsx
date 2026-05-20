import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ProductionClient from '@/components/production/ProductionClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Production — Comink',
  robots: { index: false, follow: false },
}

export default async function ProductionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?login=required')

  const service = await createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'collaborateur', 'producteur'].includes(profile.role)) {
    redirect('/')
  }

  const [linesRes, statusesRes, staffRes] = await Promise.all([
    service
      .from('production_lines')
      .select('*, status:production_statuses(*)')
      .order('created_at', { ascending: false }),
    service
      .from('production_statuses')
      .select('*')
      .order('sort_order', { ascending: true }),
    service
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['admin', 'collaborateur', 'producteur']),
  ])

  if (linesRes.error)    console.error('[production page] lines error:', JSON.stringify(linesRes.error))
  if (statusesRes.error) console.error('[production page] statuses error:', JSON.stringify(statusesRes.error))
  console.log(`[production page] lines: ${linesRes.data?.length ?? 0}, statuses: ${statusesRes.data?.length ?? 0}`)

  return (
    <ProductionClient
      lines={linesRes.data ?? []}
      statuses={statusesRes.data ?? []}
      staff={staffRes.data ?? []}
      userRole={profile.role}
    />
  )
}
