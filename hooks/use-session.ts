'use client'

import { useQuery } from '@tanstack/react-query'
import type { Session } from '@/lib/auth/session'

async function fetchSession(): Promise<Session | null> {
  const response = await fetch('/api/auth/session')
  if (!response.ok) {
    return null
  }
  return response.json()
}

export function useSession() {
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  return {
    session,
    isLoading,
    error,
    refetch,
    isAuthenticated: !!session,
    isCreative: session?.user.creativeClient === 'creative',
    isClient: session?.user.creativeClient === 'client',
  }
}
