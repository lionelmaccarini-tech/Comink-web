import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // All quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('pipeline_stage, total, expected_amount, probability, created_at, assigned_to')

    if (!quotes) return NextResponse.json({ error: 'Erreur' }, { status: 500 })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const open   = quotes.filter(q => !['won', 'lost'].includes(q.pipeline_stage))
    const won    = quotes.filter(q => q.pipeline_stage === 'won')
    const lost   = quotes.filter(q => q.pipeline_stage === 'lost')
    const wonThisMonth = won.filter(q => q.created_at >= startOfMonth)

    const pipeline_value = open.reduce((s, q) => s + (q.expected_amount || q.total || 0), 0)
    const weighted_value = open.reduce((s, q) => s + ((q.expected_amount || q.total || 0) * (q.probability || 0) / 100), 0)
    const won_total      = wonThisMonth.reduce((s, q) => s + (q.total || 0), 0)
    const conversion     = (quotes.length > 0) ? Math.round((won.length / quotes.length) * 100) : 0

    const by_stage = ['lead', 'contacted', 'quoted', 'negotiation', 'won', 'lost'].map(stage => ({
      stage,
      count:  quotes.filter(q => q.pipeline_stage === stage).length,
      amount: quotes.filter(q => q.pipeline_stage === stage).reduce((s, q) => s + (q.expected_amount || q.total || 0), 0),
    }))

    return NextResponse.json({
      total_quotes:    quotes.length,
      open_count:      open.length,
      won_count:       won.length,
      lost_count:      lost.length,
      pipeline_value,
      weighted_value,
      won_this_month:  won_total,
      conversion_rate: conversion,
      by_stage,
    })
  } catch (err) {
    console.error('[crm/stats GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
