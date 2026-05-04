import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashToken, isExpired, tokensMatch } from '@/lib/auth/password'
import { clientIp, rateLimit } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limit = rateLimit(`pwd-check:${ip}`, 30, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: { token?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const tokenLookup = hashToken(token)

  const { data: user } = await supabase
    .from('users')
    .select('name, password_set_token_hash, password_set_expires_at')
    .eq('password_set_token_hash', tokenLookup)
    .maybeSingle()

  if (
    !user ||
    !user.password_set_token_hash ||
    !tokensMatch(token, user.password_set_token_hash) ||
    isExpired(user.password_set_expires_at)
  ) {
    return NextResponse.json({ valid: false })
  }

  const needsName = !user.name || user.name.trim().length === 0

  return NextResponse.json({ valid: true, needsName })
}
