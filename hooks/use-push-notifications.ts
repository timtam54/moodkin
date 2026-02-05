'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (!supported) return

    setPermission(Notification.permission)

    // Check if already subscribed
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported) return false

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') return false

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to subscribe to push:', error)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }

      setIsSubscribed(false)
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error)
    }
  }, [])

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe }
}
