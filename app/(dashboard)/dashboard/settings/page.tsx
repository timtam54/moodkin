'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, CreditCard, Settings, Bell, Loader2, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useSession } from '@/hooks/use-session'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useOnboarding } from '@/hooks/use-onboarding'
import { SubscriptionManager } from '@/components/subscription/subscription-manager'

export default function SettingsPage() {
  const router = useRouter()
  const { session } = useSession()
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications()
  const { restartOnboarding } = useOnboarding()
  const [isTestingPush, setIsTestingPush] = useState(false)
  const [pushTestResult, setPushTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleRestartTour = () => {
    restartOnboarding()
    router.push('/dashboard/projects')
  }

  const handleTestPush = async () => {
    setIsTestingPush(true)
    setPushTestResult(null)
    try {
      const res = await fetch('/api/push/test')
      const data = await res.json()
      if (res.ok) {
        setPushTestResult({ success: true, message: 'Test notification sent! Check your device.' })
      } else {
        setPushTestResult({ success: false, message: data.error || 'Failed to send test notification' })
      }
    } catch {
      setPushTestResult({ success: false, message: 'Failed to send test notification' })
    } finally {
      setIsTestingPush(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-moodkin-gold/20 rounded-2xl mb-4">
            <Settings className="w-6 h-6 text-moodkin-gold" />
          </div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Settings</h1>
          <p className="text-moodkin-gray mt-1">Manage your account preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-moodkin-gold to-moodkin-gold-hover p-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={session?.user.avatarUrl}
                fallback={session?.user.name || session?.user.email || ''}
                size="lg"
              />
              <div>
                <h2 className="text-xl font-bold text-moodkin-dark">
                  {session?.user.name || 'User'}
                </h2>
                <p className="text-moodkin-dark/70 text-sm">
                  {session?.user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {/* Email - Read only */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-moodkin-cream/30">
              <div className="w-10 h-10 rounded-xl bg-moodkin-light-gray/50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-moodkin-gray" />
              </div>
              <div>
                <p className="font-medium text-moodkin-dark">Email</p>
                <p className="text-sm text-moodkin-gray">{session?.user.email}</p>
              </div>
            </div>

            {/* Name - Read only */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-moodkin-cream/30">
              <div className="w-10 h-10 rounded-xl bg-moodkin-light-gray/50 flex items-center justify-center">
                <User className="w-5 h-5 text-moodkin-gray" />
              </div>
              <div>
                <p className="font-medium text-moodkin-dark">Name</p>
                <p className="text-sm text-moodkin-gray">{session?.user.name || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-moodkin-light-gray/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-moodkin-gold" />
              </div>
              <h3 className="font-semibold text-moodkin-dark">Push Notifications</h3>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {!isSupported ? (
              <p className="text-sm text-moodkin-gray">Push notifications are not supported on this device/browser.</p>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
                  <div>
                    <p className="font-medium text-moodkin-dark">Status</p>
                    <p className="text-sm text-moodkin-gray">
                      {permission === 'denied' ? (
                        <span className="text-red-500">Blocked - enable in browser settings</span>
                      ) : isSubscribed ? (
                        <span className="text-green-600">Enabled</span>
                      ) : (
                        <span>Disabled</span>
                      )}
                    </p>
                  </div>
                  {permission !== 'denied' && (
                    <Button
                      onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                      variant={isSubscribed ? 'outline' : 'primary'}
                      className="rounded-full px-6"
                    >
                      {isSubscribed ? 'Disable' : 'Enable'}
                    </Button>
                  )}
                </div>

                {isSubscribed && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
                    <div>
                      <p className="font-medium text-moodkin-dark">Test Notification</p>
                      <p className="text-sm text-moodkin-gray">Send a test push to this device</p>
                    </div>
                    <Button
                      onClick={handleTestPush}
                      disabled={isTestingPush}
                      variant="outline"
                      className="rounded-full px-6"
                    >
                      {isTestingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                    </Button>
                  </div>
                )}

                {pushTestResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    pushTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {pushTestResult.success ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {pushTestResult.message}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-moodkin-light-gray/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-moodkin-gold" />
              </div>
              <h3 className="font-semibold text-moodkin-dark">Subscription</h3>
            </div>
          </div>

          <div className="p-4">
            <SubscriptionManager showProfileActions={false} />
          </div>
        </div>

        {/* Help & Support Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-moodkin-light-gray/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-moodkin-gold" />
              </div>
              <h3 className="font-semibold text-moodkin-dark">Help & Support</h3>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
              <div>
                <p className="font-medium text-moodkin-dark">Product Tour</p>
                <p className="text-sm text-moodkin-gray">Take the guided tour again</p>
              </div>
              <Button
                onClick={handleRestartTour}
                variant="outline"
                className="rounded-full px-6"
              >
                Restart Tour
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-moodkin-gray">
          Need help? Contact{" "}
          <a
            href="mailto:hello@moodkinstudio.com"
            className="underline hover:text-moodkin-pink transition-colors"
          >
            hello@moodkinstudio.com
          </a>
        </p>
      </div>
    </div>
  )
}
