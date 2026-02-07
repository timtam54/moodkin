'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useSession } from '@/hooks/use-session'

const PROMPT_DISMISSED_KEY = 'moodkin-push-prompt-dismissed'

export function PushNotificationPrompt() {
  const { session } = useSession()
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Only show if:
    // 1. User is logged in
    // 2. Push is supported
    // 3. Not already subscribed
    // 4. Permission not denied
    // 5. User hasn't dismissed the prompt
    if (
      session?.user &&
      isSupported &&
      !isSubscribed &&
      permission !== 'denied' &&
      !localStorage.getItem(PROMPT_DISMISSED_KEY)
    ) {
      // Small delay so it doesn't appear immediately on page load
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [session, isSupported, isSubscribed, permission])

  const handleEnable = async () => {
    setIsSubscribing(true)
    try {
      const success = await subscribe()
      if (success) {
        setShowPrompt(false)
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-lg border border-moodkin-light-gray p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-moodkin-gray hover:text-moodkin-dark rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-moodkin-gold/20 rounded-xl flex items-center justify-center">
          <Bell className="w-6 h-6 text-moodkin-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-moodkin-dark">Enable Notifications</h3>
          <p className="text-sm text-moodkin-gray mt-1">
            Get notified when clients or team members send messages on your projects.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          onClick={handleDismiss}
          className="flex-1"
          disabled={isSubscribing}
        >
          Not Now
        </Button>
        <Button
          variant="primary"
          onClick={handleEnable}
          className="flex-1"
          disabled={isSubscribing}
        >
          {isSubscribing ? 'Enabling...' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}
