'use client'

import { useState } from 'react'
import { Camera, Briefcase, ChevronRight, User, Mail, CreditCard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserTypeSelector } from '@/components/user-type-selector'
import { Avatar } from '@/components/ui/avatar'
import { useSession } from '@/hooks/use-session'
import type { CreativeClientType } from '@/types/database'

export default function SettingsPage() {
  const { session, refetch } = useSession()
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false)

  const handleUserTypeSelect = async (type: CreativeClientType) => {
    const response = await fetch('/api/user/type', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })

    if (!response.ok) {
      throw new Error('Failed to save user type')
    }

    await refetch()
    setShowUserTypeSelector(false)
  }

  if (showUserTypeSelector) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserTypeSelector(false)}
          className="absolute top-4 right-4 z-50 text-moodkin-gray hover:text-moodkin-dark"
        >
          Cancel
        </button>
        <UserTypeSelector onSelect={handleUserTypeSelect} />
      </div>
    )
  }

  const currentType = session?.user.creativeClient

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
            {/* User Type */}
            <button
              onClick={() => setShowUserTypeSelector(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-moodkin-cream/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
                  {currentType === 'creative' ? (
                    <Camera className="w-5 h-5 text-moodkin-gold" />
                  ) : currentType === 'client' ? (
                    <Briefcase className="w-5 h-5 text-moodkin-gold" />
                  ) : (
                    <User className="w-5 h-5 text-moodkin-gold" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-moodkin-dark">User Type</p>
                  <p className="text-sm text-moodkin-gray">
                    {currentType === 'creative'
                      ? 'Creative Professional'
                      : currentType === 'client'
                      ? 'Client'
                      : 'Not configured'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-moodkin-gray group-hover:text-moodkin-gold transition-colors" />
            </button>

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
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-moodkin-cream/50 to-moodkin-cream/30">
              <div>
                <p className="font-medium text-moodkin-dark">Current Plan</p>
                <p className="text-sm text-moodkin-gray capitalize">
                  {session?.user.subscriptionStatus === 'trial' && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Trial
                    </span>
                  )}
                  {session?.user.subscriptionStatus === 'active' && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Active
                    </span>
                  )}
                  {!session?.user.subscriptionStatus && 'Free'}
                </p>
              </div>
              {session?.user.subscriptionStatus === 'trial' && (
                <Button className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-6">
                  Upgrade
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-moodkin-gray">
          Need help? Contact support@moodkin.com
        </p>
      </div>
    </div>
  )
}
