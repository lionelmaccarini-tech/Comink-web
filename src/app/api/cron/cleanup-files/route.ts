import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { deleteFile } from '@/lib/r2/client'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const r2PublicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

  // Find orders with expired files not yet deleted
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number')
    .lte('files_expire_at', new Date().toISOString())
    .is('files_deleted_at', null)

  if (ordersError) {
    console.error('[cleanup-files] orders query error', ordersError)
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'Aucun fichier à supprimer' })
  }

  let deletedCount = 0
  const errors: string[] = []

  for (const order of orders) {
    // Get production lines with files
    const { data: lines } = await supabase
      .from('production_lines')
      .select('id, file_url, file_name')
      .eq('order_id', order.id)
      .not('file_url', 'is', null)

    for (const line of lines ?? []) {
      if (!line.file_url) continue
      try {
        // Extract R2 key from public URL
        const key = r2PublicUrl ? line.file_url.replace(`${r2PublicUrl}/`, '') : null
        if (key && key !== line.file_url) {
          await deleteFile(key)
        }
        // Null out file fields in DB
        await supabase
          .from('production_lines')
          .update({ file_url: null, file_name: null })
          .eq('id', line.id)
        deletedCount++
      } catch (err) {
        console.error(`[cleanup-files] delete error for line ${line.id}:`, err)
        errors.push(`line:${line.id}`)
      }
    }

    // Mark order files as deleted
    await supabase
      .from('orders')
      .update({ files_deleted_at: new Date().toISOString() })
      .eq('id', order.id)
  }

  console.log(`[cleanup-files] Deleted ${deletedCount} files from ${orders.length} orders`)
  return NextResponse.json({
    deleted: deletedCount,
    orders: orders.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
