'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { buttonVariants } from '@/components/ui/button'
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

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const returnUrl = searchParams.get('returnUrl')

  const googleUrl = returnUrl
    ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/api/auth/google'

  const microsoftUrl = returnUrl
    ? `/api/auth/microsoft?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/api/auth/microsoft'

  const appleUrl = returnUrl
    ? `/api/auth/apple?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/api/auth/apple'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-moodkin-cream px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Logo size="lg" showUnderline />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-moodkin-dark text-center mb-2">
            Welcome back
          </h2>
          <p className="text-moodkin-gray text-center mb-8">
            Sign in to start visual conversations with your clients
          </p>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl mb-6">
              {errorMessages[error] || 'An error occurred. Please try again.'}
            </div>
          )}

          <div className="space-y-4">
            <a
              href={googleUrl}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark'
              )}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </a>

            <a
              href={microsoftUrl}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark'
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
              href={appleUrl}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full h-12 text-base rounded-xl border-moodkin-light-gray hover:bg-gray-50 text-moodkin-dark'
              )}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </a>
          </div>

          <p className="text-xs text-center text-moodkin-gray pt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Help link */}
        <p className="text-center text-sm text-moodkin-gray mt-6">
          Need help?{' '}
          <a href="mailto:hello@moodkinstudio.com" className="underline hover:text-moodkin-pink transition-colors" >hello@moodkinstudio.com</a>
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
