'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'

export function BillingNoticeToast() {
  const { showToast } = useToast()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    showToast(
      'We could not confirm a recent payment for your subscription. Please update your billing.',
      'error',
    )
    fetch('/api/billing-notice/dismiss', { method: 'POST' }).catch(() => {})
  }, [showToast])

  return null
}
