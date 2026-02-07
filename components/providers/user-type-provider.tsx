'use client'

import { ReactNode } from 'react'

export function UserTypeProvider({ children }: { children: ReactNode }) {
  // User type (creative/client) is now determined per-project via project_users.role
  // No need for a global user type selector
  return <>{children}</>
}
