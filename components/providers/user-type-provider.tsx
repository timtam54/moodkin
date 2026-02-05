'use client'

import { ReactNode } from 'react'
import { useSession } from '@/hooks/use-session'
import { UserTypeSelector } from '@/components/user-type-selector'
import type { CreativeClientType } from '@/types/database'

export function UserTypeProvider({ children }: { children: ReactNode }) {
  const { session, isLoading, refetch } = useSession()

  const handleSelect = async (type: CreativeClientType) => {
    const response = await fetch('/api/user/type', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })

    if (!response.ok) {
      throw new Error('Failed to save user type')
    }

    await refetch()
  }

  if (isLoading) {
    return <>{children}</>
  }

  if (session && session.user.creativeClient === null) {
    return <UserTypeSelector onSelect={handleSelect} />
  }

  return <>{children}</>
}
