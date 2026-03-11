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
import { useToast } from '@/components/ui/toast'
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
  const { showToast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const subscriptionState = getSubscriptionState(user.stripeid, user.subscriptionEndsAt, user.subscriptionStatus)

  // Show toast notification once per session for subscription issues
  useEffect(() => {
    const toastKey = 'subscription_toast_shown'
    const alreadyShown = sessionStorage.getItem(toastKey)

    if (!alreadyShown) {
      if (subscriptionState.status === 'expired') {
        showToast('Your subscription has ended. You have not been billed.', 'error')
        sessionStorage.setItem(toastKey, 'true')
      } else if (subscriptionState.status === 'cancelled') {
        const endsAt = subscriptionState.endsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
        showToast(`Your subscription is cancelled. Access ends ${endsAt}.`, 'info')
        sessionStorage.setItem(toastKey, 'true')
      }
    }
  }, [subscriptionState, showToast])

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

      {/* Subscription Warning Banner */}
      {subscriptionState.status === 'expired' && (
        <div className="bg-red-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Your subscription has ended. You have not been billed.
              </p>
            </div>
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="px-3 py-1 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              Resubscribe
            </button>
          </div>
        </div>
      )}

      {subscriptionState.status === 'cancelled' && (
        <div className="bg-amber-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Your subscription is cancelled. Access ends {subscriptionState.endsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}.
              </p>
            </div>
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="px-3 py-1 bg-white text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors flex-shrink-0"
            >
              Resubscribe
            </button>
          </div>
        </div>
      )}

      {/* User Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
        <SubscriptionManager onClose={() => setProfileDialogOpen(false)} />
      </Dialog>
    </header>
  )
}
