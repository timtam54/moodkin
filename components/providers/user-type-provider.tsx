'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from '@/hooks/use-session'
import { UserTypeSelector } from '@/components/user-type-selector'
import type { CreativeClientType } from '@/types/database'

export function UserTypeProvider({ children }: { children: ReactNode }) {
  const { session, isLoading, refetch } = useSession()
  const pathname = usePathname()

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

  // Skip the user type selector on invite pages - they'll set type when accepting
  const isInvitePage = pathname?.startsWith('/invite')

  if (session && session.user.creativeClient === null && !isInvitePage) {
    return <UserTypeSelector onSelect={handleSelect} />
  }

  return <>{children}</>
}
