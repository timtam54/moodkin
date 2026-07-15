'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, ExternalLink } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInAppBrowser() {
  const nav = navigator as Navigator & { vendor?: string }
  const ua = nav.userAgent || nav.vendor || ''
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line|Twitter|MicroMessenger|TikTok|LinkedInApp/i.test(ua)
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [inAppBrowser, setInAppBrowser] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    console.log('[PWA] Standalone mode:', standalone)

    // Detect iOS and Android
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const android = /Android/.test(navigator.userAgent)
    setIsIOS(ios)
    setIsAndroid(android)
    console.log('[PWA] iOS:', ios, 'Android:', android)
    console.log('[PWA] User Agent:', navigator.userAgent)

    // Detect in-app browser (Facebook, Instagram, Messenger, etc.)
    const inApp = isInAppBrowser()
    setInAppBrowser(inApp)
    console.log('[PWA] In-app browser:', inApp)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] SW registered:', registration.scope)

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
          console.error('[PWA] SW registration failed:', error)
        })
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired!')
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show banner after a short delay (ignore dismissed state for now to debug)
      setTimeout(() => {
        console.log('[PWA] Showing install banner')
        setShowInstallBanner(true)
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    console.log('[PWA] Listening for beforeinstallprompt event')

    // Show iOS instructions if on iOS and not installed
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => {
          setShowInstallBanner(true)
        }, 3000)
      }
    }

    // In an in-app browser (Facebook, Instagram, etc.) beforeinstallprompt
    // won't fire — show a "open in your browser" banner instead.
    if (inApp && !standalone) {
      const dismissed = localStorage.getItem('pwa-inapp-dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
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
    localStorage.setItem(inAppBrowser ? 'pwa-inapp-dismissed' : 'pwa-install-dismissed', 'true')
  }

  const handleOpenInChrome = () => {
    // Android: use intent:// to hand off to Chrome
    const url = location.href.replace(/^https?:\/\//, '')
    location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`
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
          <h3 className="font-semibold text-sm">
            {inAppBrowser ? 'Open in your browser' : 'Install Moodkin'}
          </h3>
          {inAppBrowser ? (
            isIOS ? (
              <p className="text-xs text-gray-300 mt-1">
                Tap <span aria-hidden>•••</span> at the bottom right, then &quot;Open in Safari&quot; to install the app.
              </p>
            ) : isAndroid ? (
              <p className="text-xs text-gray-300 mt-1">
                Tap below to open in Chrome, then install from there.
              </p>
            ) : (
              <p className="text-xs text-gray-300 mt-1">
                Open this page in your device&apos;s browser to install the app.
              </p>
            )
          ) : isIOS ? (
            <p className="text-xs text-gray-300 mt-1">
              Tap <Share className="w-3 h-3 inline-block mx-0.5" /> then &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-1">
              Get quick access from your home screen
            </p>
          )}

          {inAppBrowser && isAndroid && (
            <button
              onClick={handleOpenInChrome}
              className="mt-3 w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium text-sm py-2 px-4 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Chrome
            </button>
          )}

          {!inAppBrowser && !isIOS && (
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
