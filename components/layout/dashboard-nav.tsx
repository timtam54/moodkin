'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth/client'
import { PushNotificationPrompt } from '@/components/pwa/push-notification-prompt'
import { NotificationsHub } from '@/components/notifications/notifications-hub'
import { getSubscriptionState } from '@/lib/config/subscription'
import { SubscriptionManager } from '@/components/subscription/subscription-manager'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [subscriptionNoticeOpen, setSubscriptionNoticeOpen] = useState(false)
  const subscriptionState = getSubscriptionState(user.stripeid, user.subscriptionEndsAt, user.subscriptionStatus)

  // Show subscription notice dialog once per session
  useEffect(() => {
    const noticeKey = 'subscription_notice_shown'
    const alreadyShown = sessionStorage.getItem(noticeKey)

    if (!alreadyShown && (subscriptionState.status === 'expired' || subscriptionState.status === 'cancelled')) {
      setSubscriptionNoticeOpen(true)
      sessionStorage.setItem(noticeKey, 'true')
    }
  }, [subscriptionState])

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

          {/* Desktop User section - simplified */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationsHub />
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <Avatar
                src={user.avatarUrl}
                fallback={user.name || user.email}
                size="sm"
              />
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

      {/* Mobile dropdown menu - simplified */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-moodkin-dark border-t border-white/10">
          <nav className="px-4 py-3 space-y-1">
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

            {/* Sign out as a nav item */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Push notification prompt */}
      <PushNotificationPrompt />

      {/* Subscription Notice Dialog */}
      <Dialog open={subscriptionNoticeOpen} onClose={() => setSubscriptionNoticeOpen(false)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-moodkin-dark mb-2">
            {subscriptionState.status === 'expired' ? 'Subscription Ended' : 'Subscription Cancelled'}
          </h2>
          <p className="text-moodkin-gray mb-6">
            {subscriptionState.status === 'expired'
              ? 'Your subscription has ended. You have not been billed. Resubscribe anytime to continue enjoying premium features.'
              : subscriptionState.status === 'cancelled'
                ? `Your subscription is cancelled. You'll have access until ${subscriptionState.endsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}.`
                : ''}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setSubscriptionNoticeOpen(false)}
            >
              OK
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSubscriptionNoticeOpen(false)
                setProfileDialogOpen(true)
              }}
            >
              Resubscribe
            </Button>
          </div>
        </div>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
        <SubscriptionManager onClose={() => setProfileDialogOpen(false)} />
      </Dialog>
    </header>
  )
}
