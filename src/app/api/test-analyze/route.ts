import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export async function GET() {
  const envKey = 'ANTHROPIC_API_KEY'
  const key = (process.env as Record<string, string | undefined>)[envKey]
  return NextResponse.json({
    key_present: !!key,
    key_prefix: key ? key.substring(0, 12) + '...' : 'MISSING',
    node_env: process.env.NODE_ENV,
    method: 'bracket_notation',
  })
}
