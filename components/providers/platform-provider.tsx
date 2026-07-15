'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Platform } from '@/lib/platform/cookie'

const PlatformContext = createContext<Platform>('web')

export function PlatformProvider({
  platform,
  children,
}: {
  platform: Platform
  children: ReactNode
}) {
  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
}

export function usePlatform(): Platform {
  return useContext(PlatformContext)
}

export function useIsAndroidApp(): boolean {
  return useContext(PlatformContext) === 'android-app'
}
