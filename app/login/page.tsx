'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

const errorMessages: Record<string, string> = {
  google_auth_failed: 'Google authentication failed. Please try again.',
  microsoft_auth_failed: 'Microsoft authentication failed. Please try again.',
  apple_auth_failed: 'Apple authentication failed. Please try again.',
  no_code: 'Authentication was cancelled.',
  no_email: 'Could not retrieve email from your account.',
  create_failed: 'Failed to create account. Please try again.',
  auth_failed: 'Authentication failed. Please try again.',
}

const providerLabels: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  apple: 'Apple',
}

type Mode = 'oauth' | 'email' | 'check-email' | 'provider-conflict'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const returnUrl = searchParams.get('returnUrl')

  const [mode, setMode] = useState<Mode>('oauth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [conflictProvider, setConflictProvider] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const buildOauthUrl = (provider: 'google' | 'microsoft' | 'apple') =>
    returnUrl
      ? `/api/auth/${provider}?returnUrl=${encodeURIComponent(returnUrl)}`
      : `/api/auth/${provider}`

  async function sendSetupEmail(reason: 'auto' | 'forgot') {
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Could not send email')
        return false
      }
      if (data.status === 'provider_conflict') {
        setConflictProvider(data.provider)
        setMode('provider-conflict')
        return true
      }
      setMode('check-email')
      return true
    } finally {
      setSubmitting(false)
      void reason
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!email) return

    // No password typed → treat as "send me a setup/reset link" instead of
    // attempting login. /request handles new vs existing accounts uniformly.
    if (!password) {
      await sendSetupEmail('auto')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push(returnUrl || '/dashboard')
        router.refresh()
        return
      }

      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && data.status === 'provider_conflict') {
        setConflictProvider(data.provider)
        setMode('provider-conflict')
        return
      }

      if (res.status === 409 && data.status === 'needs_setup') {
        // New account or account without a password yet — send setup email.
        // We deliberately ignore whatever they typed in the password field;
        // they'll choose their real password from the email link.
        setSubmitting(false)
        await sendSetupEmail('auto')
        return
      }

      setFormError(data.error || 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-moodkin-cream px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo size="lg" showUnderline />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-moodkin-dark text-center mb-2">
            Welcome back
          </h2>
          <p className="text-moodkin-gray text-center mb-8">
            Sign in to start visual conversations with your clients
          </p>

          {error && mode === 'oauth' && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl mb-6">
              {errorMessages[error] || 'An error occurred. Please try again.'}
            </div>
          )}

          {mode === 'oauth' && (
            <>
              <div className="space-y-4">
                <a
                  href={buildOauthUrl('google')}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark',
                  )}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </a>

                <a
                  href={buildOauthUrl('microsoft')}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark',
                  )}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Continue with Microsoft
                </a>

                <a
                  href={buildOauthUrl('apple')}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark',
                  )}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </a>
              </div>

              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-moodkin-light-gray" />
                <span className="px-3 text-xs uppercase tracking-wide text-moodkin-gray">or</span>
                <div className="flex-1 h-px bg-moodkin-light-gray" />
              </div>

              <button
                type="button"
                onClick={() => setMode('email')}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark',
                )}
              >
                Continue with email
              </button>
            </>
          )}

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-moodkin-dark mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-moodkin-dark mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="h-12 rounded-xl"
                />
                <p className="text-xs text-moodkin-gray mt-1">
                  New here, or don&apos;t have a password yet? Leave this blank — we&apos;ll
                  email you a link to create one.
                </p>
              </div>

              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{formError}</div>
              )}

              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
                {submitting ? 'Please wait…' : 'Continue'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode('oauth')
                    setEmail('')
                    setPassword('')
                    setFormError(null)
                  }}
                  className="text-moodkin-gray hover:text-moodkin-dark"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      setFormError('Enter your email first')
                      return
                    }
                    void sendSetupEmail('forgot')
                  }}
                  disabled={submitting}
                  className="text-moodkin-pink hover:underline"
                >
                  Forgot password
                </button>
              </div>
            </form>
          )}

          {mode === 'check-email' && (
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-moodkin-dark">Check your email</h3>
              <p className="text-moodkin-gray">
                We&apos;ve sent a link to <strong>{email}</strong> to set or reset your
                password. The link expires soon — please check your inbox (and spam
                folder).
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('oauth')
                  setEmail('')
                  setPassword('')
                }}
                className="text-sm text-moodkin-gray hover:text-moodkin-dark"
              >
                Back to sign in
              </button>
            </div>
          )}

          {mode === 'provider-conflict' && conflictProvider && (
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-moodkin-dark">
                Use {providerLabels[conflictProvider] || conflictProvider} to sign in
              </h3>
              <p className="text-moodkin-gray">
                <strong>{email}</strong> is already linked to{' '}
                {providerLabels[conflictProvider] || conflictProvider}. Continue with
                that provider to sign in.
              </p>
              <a
                href={buildOauthUrl(conflictProvider as 'google' | 'microsoft' | 'apple')}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'w-full h-12 text-base rounded-xl',
                )}
              >
                Continue with {providerLabels[conflictProvider] || conflictProvider}
              </a>
              <button
                type="button"
                onClick={() => {
                  setMode('email')
                  setConflictProvider(null)
                }}
                className="text-sm text-moodkin-gray hover:text-moodkin-dark"
              >
                Use a different email
              </button>
            </div>
          )}

          <p className="text-xs text-center text-moodkin-gray pt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <p className="text-center text-sm text-moodkin-gray mt-6">
          Need help?{' '}
          <a
            href="mailto:hello@moodkinstudio.com"
            className="underline hover:text-moodkin-pink transition-colors"
          >
            hello@moodkinstudio.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-moodkin-cream">
          <Loading message="Loading..." />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
