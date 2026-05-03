import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { clientIp, rateLimit } from '@/lib/auth/rate-limit'

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limit = rateLimit(`pwd-login-ip:${ip}`, 20, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: 'Enter a password' }, { status: 400 })
  }

  // Per-account cap on top of per-IP.
  const perAccount = rateLimit(`pwd-login-acct:${email}`, 10, 60_000)
  if (!perAccount.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(perAccount.retryAfterSeconds) } },
    )
  }

  const supabase = await createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash, auth_provider')
    .eq('email', email)
    .maybeSingle()

  // Account exists but is OAuth-only — direct them to the right provider.
  if (user && user.auth_provider && user.auth_provider !== 'password' && !user.password_hash) {
    return NextResponse.json(
      { status: 'provider_conflict', provider: user.auth_provider },
      { status: 409 },
    )
  }

  // Account exists but has no password yet (or is brand new) — caller should
  // trigger the setup email. We treat "user does not exist" the same way so
  // the new-user path is seamless: type email + any password, get a setup link.
  if (!user || !user.password_hash) {
    return NextResponse.json({ status: 'needs_setup' }, { status: 409 })
  }

  const matches = await verifyPassword(password, user.password_hash)
  if (!matches) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await createSession(user.id)
  return NextResponse.json({ status: 'ok' })
}
