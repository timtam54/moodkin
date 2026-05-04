'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [needsName, setNeedsName] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/password/check-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data.valid) {
          setTokenValid(true)
          setNeedsName(Boolean(data.needsName))
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading message="Loading..." />
      </div>
    )
  }

  if (!token || !tokenValid) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <h2 className="text-xl font-semibold text-moodkin-dark mb-2">Invalid or expired link</h2>
        <p className="text-moodkin-gray mb-6">
          This password link is no longer valid. Request a new one from the sign in
          page.
        </p>
        <a href="/login" className="text-moodkin-pink hover:underline">
          Back to sign in
        </a>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (needsName && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          ...(needsName ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
        }),
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not set password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h2 className="text-2xl font-bold text-moodkin-dark text-center mb-2">
        {needsName ? 'Finish setting up your account' : 'Choose a password'}
      </h2>
      <p className="text-moodkin-gray text-center mb-8">
        {needsName
          ? 'Tell us your name and pick a password to get started.'
          : 'Use at least 10 characters with letters and numbers.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {needsName && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-moodkin-dark mb-1">
                First name
              </label>
              <Input
                id="firstName"
                type="text"
                required
                autoFocus
                maxLength={60}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-moodkin-dark mb-1">
                Last name
              </label>
              <Input
                id="lastName"
                type="text"
                required
                maxLength={60}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-moodkin-dark mb-1">
            New password
          </label>
          <Input
            id="password"
            type="password"
            required
            autoFocus={!needsName}
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
          />
          {!needsName && (
            <p className="text-xs text-moodkin-gray mt-1">
              At least 10 characters with letters and numbers.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-moodkin-dark mb-1">
            Confirm password
          </label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={10}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>
        )}

        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
          {submitting ? 'Saving…' : 'Save and sign in'}
        </Button>
      </form>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-moodkin-cream px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo size="lg" showUnderline />
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loading message="Loading..." />
            </div>
          }
        >
          <SetPasswordContent />
        </Suspense>
      </div>
    </div>
  )
}
