import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateSetupToken } from '@/lib/auth/password'
import { sendPasswordEmail } from '@/lib/auth/password-email'
import { clientIp, rateLimit } from '@/lib/auth/rate-limit'

interface ProviderConflictResponse {
  status: 'provider_conflict'
  provider: string
}

interface OkResponse {
  status: 'ok'
}

type RequestResponse = OkResponse | ProviderConflictResponse

export async function POST(request: Request): Promise<NextResponse<RequestResponse | { error: string }>> {
  const ip = clientIp(request)
  const limit = rateLimit(`pwd-request:${ip}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  }

  // Per-email rate limit too — don't let an attacker spam tokens at one address.
  const perEmail = rateLimit(`pwd-request-email:${emailRaw}`, 5, 60 * 60_000)
  if (!perEmail.ok) {
    // Silently succeed to avoid signalling existence; just skip the work.
    return NextResponse.json<OkResponse>({ status: 'ok' })
  }

  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, auth_provider, password_hash')
    .eq('email', emailRaw)
    .maybeSingle()

  // OAuth-only account: tell the client to redirect them to the right provider.
  // This is the one exception to the no-enumeration rule — without it the user
  // is stuck in a loop, and OAuth provider association on a known email isn't
  // very sensitive (the email already exists publicly with that provider).
  if (existing && existing.auth_provider && !existing.password_hash) {
    return NextResponse.json<ProviderConflictResponse>({
      status: 'provider_conflict',
      provider: existing.auth_provider,
    })
  }

  const isReset = Boolean(existing?.password_hash)
  const token = generateSetupToken(isReset ? 'reset' : 'setup')

  let userId = existing?.id
  if (!existing) {
    const { data: created, error } = await supabase
      .from('users')
      .insert({
        email: emailRaw,
        auth_provider: 'password',
        password_set_token_hash: token.tokenHash,
        password_set_expires_at: token.expiresAt,
      })
      .select('id')
      .single()
    if (error || !created) {
      console.error('[pwd-request] create user failed', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      })
      return NextResponse.json({ error: 'Could not process request' }, { status: 500 })
    }
    userId = created.id
  } else {
    const { error } = await supabase
      .from('users')
      .update({
        password_set_token_hash: token.tokenHash,
        password_set_expires_at: token.expiresAt,
      })
      .eq('id', existing.id)
    if (error) {
      console.error('[pwd-request] update token failed', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json({ error: 'Could not process request' }, { status: 500 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${appUrl}/set-password?token=${token.rawToken}`

  try {
    await sendPasswordEmail({
      to: emailRaw,
      link,
      mode: isReset ? 'reset' : 'setup',
    })
  } catch (err) {
    console.error('[pwd-request] email send failed', err)
    // Don't reveal email failure to client; user can try again.
  }

  void userId
  return NextResponse.json<OkResponse>({ status: 'ok' })
}
