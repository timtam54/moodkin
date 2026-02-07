'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

interface InviteDetails {
  id: string
  project_id: string
  email: string
  role: 'creative' | 'client'
  invite_status: string
  project_title?: string
  inviter_name?: string
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { session, isLoading: sessionLoading } = useSession()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Invite not found')
        }
        const data = await res.json()
        setInvite(data)
        setProjectId(data.project_id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invite')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchInvite()
    }
  }, [token])

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      const result = await res.json()
      setSuccess(true)
      if (result.project_id) {
        setProjectId(result.project_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-moodkin-cream flex items-center justify-center">
        <Loading message="Loading invite..." />
      </div>
    )
  }

  if (error) {
    const isEmailMismatch = error.includes('sent to') || error.includes('sign in with')
    return (
      <div className="min-h-screen bg-moodkin-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <XCircle className={`w-16 h-16 mx-auto mb-4 ${isEmailMismatch ? 'text-amber-500' : 'text-red-500'}`} />
          <h1 className="text-xl font-bold text-moodkin-dark mb-2">
            {isEmailMismatch ? 'Wrong Account' : 'Invite Not Found'}
          </h1>
          <p className="text-moodkin-gray mb-6">{error}</p>
          {isEmailMismatch ? (
            <div className="space-y-3">
              <a href="/api/auth/logout" className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
                Sign Out & Try Again
              </a>
              <a href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                Go to Dashboard
              </a>
            </div>
          ) : (
            <a href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>
              Go to Dashboard
            </a>
          )}
        </div>
      </div>
    )
  }

  if (success) {
    // All users go to the project page
    const projectUrl = `/dashboard/projects/${projectId}`

    return (
      <div className="min-h-screen bg-moodkin-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-moodkin-dark mb-2">Welcome to the Project!</h1>
          <p className="text-moodkin-gray mb-6">
            You now have access to &quot;{invite?.project_title}&quot;.
          </p>
          <a
            href={projectUrl}
            className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
          >
            Go to Project
          </a>
        </div>
      </div>
    )
  }

  if (invite?.invite_status === 'accepted') {
    return (
      <div className="min-h-screen bg-moodkin-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-moodkin-gold mx-auto mb-4" />
          <h1 className="text-xl font-bold text-moodkin-dark mb-2">Already Accepted</h1>
          <p className="text-moodkin-gray mb-6">
            You&apos;ve already accepted this invite. Go to the project to start collaborating.
          </p>
          <a
            href={`/dashboard/projects/${invite?.project_id}`}
            className={cn(buttonVariants({ variant: 'primary' }))}
          >
            Go to Project
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moodkin-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-moodkin-gold to-moodkin-gold-hover p-8 text-center">
          <h1 className="text-2xl font-bold text-moodkin-dark tracking-widest">MOODKIN</h1>
          <p className="text-moodkin-dark/70 mt-2">You&apos;ve been invited!</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <p className="text-moodkin-gray mb-4">
              <strong className="text-moodkin-dark">{invite?.inviter_name || 'Someone'}</strong> has invited you to collaborate on:
            </p>
            <div className="bg-moodkin-cream rounded-xl p-4 mb-4">
              <h2 className="text-xl font-bold text-moodkin-dark">{invite?.project_title}</h2>
              <span className="inline-block mt-2 px-3 py-1 bg-moodkin-gold text-moodkin-dark text-sm font-medium rounded-full capitalize">
                {invite?.role}
              </span>
            </div>
            <p className="text-sm text-moodkin-gray">
              As a {invite?.role}, you&apos;ll be able to view the project, its assets, and collaborate with the team.
            </p>
          </div>

          {!session?.user ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium text-center">
                  You must sign in with:
                </p>
                <p className="text-base text-amber-900 font-bold text-center mt-1">
                  {invite?.email}
                </p>
              </div>
              <p className="text-xs text-center text-moodkin-gray">
                Make sure to select this email when signing in with Google or Microsoft.
              </p>
              <a
                href={`/login?returnUrl=/invite/${token}`}
                className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
              >
                Sign In to Accept
              </a>
            </div>
          ) : session?.user?.email?.toLowerCase() !== invite?.email?.toLowerCase() ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-800 font-medium text-center">
                  Wrong account! This invite was sent to:
                </p>
                <p className="text-base text-red-900 font-bold text-center mt-1">
                  {invite?.email}
                </p>
                <p className="text-xs text-red-700 text-center mt-2">
                  You&apos;re signed in as {session?.user?.email}
                </p>
              </div>
              <a
                href="/api/auth/logout"
                className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
              >
                Sign Out & Use Correct Account
              </a>
              <a
                href="/dashboard"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                Go to Dashboard
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </button>
              <a
                href="/dashboard"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                Decline
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
