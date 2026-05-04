import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth/session'
import {
  hashPassword,
  hashToken,
  isExpired,
  tokensMatch,
  validatePasswordStrength,
} from '@/lib/auth/password'
import { clientIp, rateLimit } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limit = rateLimit(`pwd-set:${ip}`, 20, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: {
    token?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }

  const passwordError = validatePasswordStrength(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const tokenLookup = hashToken(token)

  const { data: user } = await supabase
    .from('users')
    .select('id, name, password_set_token_hash, password_set_expires_at')
    .eq('password_set_token_hash', tokenLookup)
    .maybeSingle()

  if (
    !user ||
    !user.password_set_token_hash ||
    !tokensMatch(token, user.password_set_token_hash) ||
    isExpired(user.password_set_expires_at)
  ) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }

  const needsName = !user.name || user.name.trim().length === 0
  if (needsName) {
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First and last name are required' },
        { status: 400 },
      )
    }
    if (firstName.length > 60 || lastName.length > 60) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 })
    }
  }

  const passwordHash = await hashPassword(password)

  const update: {
    password_hash: string
    password_set_token_hash: null
    password_set_expires_at: null
    name?: string
  } = {
    password_hash: passwordHash,
    password_set_token_hash: null,
    password_set_expires_at: null,
  }
  if (needsName) {
    update.name = `${firstName} ${lastName}`
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(update)
    .eq('id', user.id)

  if (updateError) {
    console.error('[pwd-set] update failed', updateError)
    return NextResponse.json({ error: 'Could not set password' }, { status: 500 })
  }

  await createSession(user.id)
  return NextResponse.json({ status: 'ok' })
}
