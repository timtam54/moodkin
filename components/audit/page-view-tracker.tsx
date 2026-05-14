'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (lastSent.current === pathname) return
    lastSent.current = pathname

    const isPwa =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        // iOS Safari
        // @ts-expect-error legacy iOS property
        window.navigator.standalone === true)

    fetch('/api/audit/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ path: pathname, isPwa }),
    }).catch(() => {})
  }, [pathname])

  return null
}
