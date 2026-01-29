'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function authenticate() {
      try {
        const res = await fetch('/api/c/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Invalid or expired invite link')
          return
        }

        const { conversationId } = await res.json()
        router.replace(`/c/${conversationId}`)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    }

    authenticate()
  }, [token, router])

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invite Link Error</h2>
        <p className="text-gray-500">{error}</p>
        <p className="text-sm text-gray-400 mt-4">
          Please ask your photographer for a new invite link.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <div className="animate-pulse">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Opening your moodboard...</h2>
        <p className="text-gray-500">Please wait while we set things up.</p>
      </div>
    </div>
  )
}
