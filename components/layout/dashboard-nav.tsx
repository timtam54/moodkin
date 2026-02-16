'use client'

import { useState } from 'react'
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
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { logout } from '@/lib/auth/client'
import { PushNotificationPrompt } from '@/components/pwa/push-notification-prompt'
import type { SessionUser } from '@/lib/auth/session'

interface DashboardNavProps {
  user: SessionUser
}

const navItems = [
  { href: '/dashboard/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients' },
  { href: '/dashboard/settings', icon: Settings, label: 'Profile' },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(user.stripeid === 'subscribed')
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false)

  const handleSubscriptionToggle = async () => {
    setIsUpdatingSubscription(true)
    try {
      const newSubscribed = !isSubscribed
      const response = await fetch('/api/user/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: newSubscribed }),
      })
      if (response.ok) {
        setIsSubscribed(newSubscribed)
      }
    } catch (error) {
      console.error('Failed to update subscription:', error)
    } finally {
      setIsUpdatingSubscription(false)
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

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white/70 hover:text-white"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
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

          {/* Subscription Status Switch */}
          <div className="mt-4 flex items-center gap-3">
            <span className={cn(
              "text-sm font-medium",
              !isSubscribed ? "text-moodkin-dark" : "text-moodkin-gray"
            )}>
              Free
            </span>
            <button
              onClick={handleSubscriptionToggle}
              disabled={isUpdatingSubscription}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                isSubscribed ? "bg-moodkin-gold" : "bg-moodkin-light-gray",
                isUpdatingSubscription && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                isSubscribed ? "translate-x-7" : "translate-x-1"
              )} />
            </button>
            <span className={cn(
              "text-sm font-medium",
              isSubscribed ? "text-moodkin-dark" : "text-moodkin-gray"
            )}>
              Subscribed
            </span>
          </div>

          <div className="mt-6 flex gap-3">
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
        </div>
      </Dialog>
    </header>
  )
}
