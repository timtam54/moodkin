'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Check every hour

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.log('SW registration failed:', error)
        })
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if user has dismissed the banner before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Show banner after a short delay
        setTimeout(() => {
          setShowInstallBanner(true)
        }, 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Show iOS instructions if on iOS and not installed
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => {
          setShowInstallBanner(true)
        }, 3000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed
  if (isStandalone || !showInstallBanner) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-moodkin-dark text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-moodkin-gold rounded-lg shrink-0">
          <Download className="w-5 h-5 text-moodkin-dark" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install Moodkin</h3>
          {isIOS ? (
            <p className="text-xs text-gray-300 mt-1">
              Tap <Share className="w-3 h-3 inline-block mx-0.5" /> then &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-1">
              Get quick access from your home screen
            </p>
          )}

          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium text-sm py-2 px-4 rounded-lg transition-colors"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
