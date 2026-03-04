'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Mail,
  Crown,
  CreditCard,
  Loader2,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { logout } from '@/lib/auth/client'
import { PushNotificationPrompt } from '@/components/pwa/push-notification-prompt'
import { PaymentDialog } from '@/components/payment/payment-dialog'
import { NotificationsHub } from '@/components/notifications/notifications-hub'
import { subscriptionConfig, formatPrice, isSubscriptionActive, getSubscriptionState } from '@/lib/config/subscription'
import { useOnboarding } from '@/hooks/use-onboarding'
import type { SessionUser } from '@/lib/auth/session'

interface DashboardNavProps {
  user: SessionUser
}

const navItems = [
  { href: '/dashboard/projects', icon: FolderOpen, label: 'Projects', tourId: 'projects-nav' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients', tourId: 'clients-nav' },
  { href: '/dashboard/settings', icon: Settings, label: 'Profile' },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { restartOnboarding } = useOnboarding()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(isSubscriptionActive(user.stripeid, user.subscriptionEndsAt))
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [aiImageCount, setAiImageCount] = useState<{ count: number; limit: number; month: string } | null>(null)
  const subscriptionState = getSubscriptionState(user.stripeid, user.subscriptionEndsAt, user.subscriptionStatus)

  // Fetch AI image count when profile dialog opens (for active or cancelled subscriptions)
  useEffect(() => {
    const hasAccess = subscriptionState.status === 'active' || subscriptionState.status === 'cancelled'
    if (profileDialogOpen && hasAccess) {
      fetch('/api/user/ai-image-count')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setAiImageCount(data)
        })
        .catch(err => console.error('Failed to fetch AI image count:', err))
    }
  }, [profileDialogOpen, subscriptionState.status])

  const handleTakeTour = () => {
    setProfileDialogOpen(false)
    restartOnboarding()
  }

  const handlePaymentSuccess = async (customerId: string) => {
    try {
      const response = await fetch('/api/user/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeid: customerId }),
      })
      if (response.ok) {
        setIsSubscribed(true)
        // Refresh the page to update user data
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update subscription:', error)
    }
  }

  const handleManageSubscription = async () => {
    if (!user.stripeid) return
    setIsLoadingPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        // Show error to user instead of just logging
        alert(data.error || 'Failed to open subscription portal. Please try again or contact support.')
      }
    } catch (error) {
      console.error('Failed to open subscription portal:', error)
      alert('Failed to open subscription portal. Please try again.')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-moodkin-dark">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/projects">
            <Image
              src="/darklogo.png"
              alt="Moodkin"
              width={150}
              height={48}
              className="object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourId}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop User section */}
          <div className="hidden md:flex items-center gap-3">
            <NotificationsHub />
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar
                src={user.avatarUrl}
                fallback={user.name || user.email}
                size="sm"
              />
            </button>
            <span className="text-sm text-white/70 hidden lg:block">
              {user.name || user.email}
            </span>
            <button
              onClick={() => logout()}
              className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile notifications and hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <NotificationsHub />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/70 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-moodkin-dark border-t border-white/10">
          <nav className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile user section */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  setProfileDialogOpen(true)
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <Avatar
                  src={user.avatarUrl}
                  fallback={user.name || user.email}
                  size="md"
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-white/50 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push notification prompt */}
      <PushNotificationPrompt />

      {/* User Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
        <div className="flex flex-col items-center text-center">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name || 'Profile photo'}
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full bg-moodkin-gold flex items-center justify-center">
              <span className="text-4xl font-bold text-moodkin-dark">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h2 className="text-xl font-bold text-moodkin-dark mt-4">
            {user.name || 'User'}
          </h2>
          <div className="flex items-center gap-2 text-moodkin-gray mt-1">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>

          {/* Subscription Status */}
          <div className="mt-4 flex flex-col items-center gap-2 w-full">
            {subscriptionState.status === 'active' && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold/20 text-moodkin-dark rounded-xl">
                  <Crown className="w-4 h-4 text-moodkin-gold" />
                  <span className="text-sm font-medium">Subscribed</span>
                </div>

                {/* AI Image Usage */}
                {aiImageCount && (
                  <div className="w-full mt-2 p-3 bg-moodkin-cream/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-moodkin-gold" />
                        <span className="text-sm font-medium text-moodkin-dark">AI Images</span>
                      </div>
                      <span className="text-sm text-moodkin-gray">
                        {aiImageCount.count} / {aiImageCount.limit}
                      </span>
                    </div>
                    <div className="h-2 bg-moodkin-light-gray rounded-full overflow-hidden">
                      <div
                        className="h-full bg-moodkin-gold rounded-full transition-all"
                        style={{ width: `${Math.min((aiImageCount.count / aiImageCount.limit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-moodkin-gray mt-1 text-center">
                      {aiImageCount.month}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="flex items-center gap-2 px-4 py-2 border border-moodkin-light-gray hover:bg-moodkin-cream text-moodkin-dark font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isLoadingPortal ? 'Loading...' : 'Manage Subscription'}
                </button>
              </>
            )}

            {subscriptionState.status === 'cancelled' && (
              <>
                <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-700 mb-1">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">Subscription Cancelled</span>
                  </div>
                  <p className="text-xs text-amber-600">
                    You still have access until {subscriptionState.endsAt.toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* AI Image Usage - still show while they have access */}
                {aiImageCount && (
                  <div className="w-full mt-2 p-3 bg-moodkin-cream/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-moodkin-gold" />
                        <span className="text-sm font-medium text-moodkin-dark">AI Images</span>
                      </div>
                      <span className="text-sm text-moodkin-gray">
                        {aiImageCount.count} / {aiImageCount.limit}
                      </span>
                    </div>
                    <div className="h-2 bg-moodkin-light-gray rounded-full overflow-hidden">
                      <div
                        className="h-full bg-moodkin-gold rounded-full transition-all"
                        style={{ width: `${Math.min((aiImageCount.count / aiImageCount.limit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-moodkin-gray mt-1 text-center">
                      {aiImageCount.month}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setProfileDialogOpen(false)
                    setPaymentDialogOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Resubscribe - {formatPrice()}/month
                </button>
              </>
            )}

            {subscriptionState.status === 'expired' && (
              <>
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium">Subscription Ended</span>
                  </div>
                  <p className="text-xs text-red-600">
                    Your subscription has ended. You have not been billed.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProfileDialogOpen(false)
                    setPaymentDialogOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Subscribe Now - {formatPrice()}/month
                </button>
              </>
            )}

            {subscriptionState.status === 'none' && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-moodkin-light-gray/30 text-moodkin-gray rounded-xl">
                  <span className="text-sm font-medium">Not Subscribed</span>
                </div>
                <button
                  onClick={() => {
                    setProfileDialogOpen(false)
                    setPaymentDialogOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Subscribe Now - {formatPrice()}/month
                </button>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex gap-3">
              <Link
                href="/dashboard/settings"
                onClick={() => setProfileDialogOpen(false)}
                className="px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                Edit Profile
              </Link>
              <button
                onClick={() => logout()}
                className="px-4 py-2 border border-moodkin-light-gray hover:bg-moodkin-cream text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
            <button
              onClick={handleTakeTour}
              className="flex items-center justify-center gap-2 px-4 py-2 text-moodkin-gray hover:text-moodkin-dark text-sm transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Take a tour
            </button>
          </div>
        </div>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        username={user.name || user.email}
        email={user.email}
        amount={subscriptionConfig.price}
        onSuccess={handlePaymentSuccess}
      />
    </header>
  )
}
