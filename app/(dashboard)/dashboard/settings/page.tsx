'use client'

import { useState } from 'react'
import { Camera, Briefcase, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserTypeSelector } from '@/components/user-type-selector'
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-moodkin-dark">Settings</h1>
        <p className="text-moodkin-gray mt-1">Manage your account preferences</p>
      </div>

      {/* Account Settings */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-moodkin-dark">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Type Configuration */}
          <button
            onClick={() => setShowUserTypeSelector(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-moodkin-cream/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
                {currentType === 'creative' ? (
                  <Camera className="w-6 h-6 text-moodkin-gold" />
                ) : currentType === 'client' ? (
                  <Briefcase className="w-6 h-6 text-moodkin-gold" />
                ) : (
                  <Camera className="w-6 h-6 text-moodkin-gold" />
                )}
              </div>
              <div>
                <p className="font-medium text-moodkin-dark">User Type</p>
                <p className="text-sm text-moodkin-gray">
                  {currentType === 'creative'
                    ? 'Creative (Photographer, stylist, designer)'
                    : currentType === 'client'
                    ? 'Client'
                    : 'Not configured'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-moodkin-gray" />
          </button>

          {/* Email */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
            <div>
              <p className="font-medium text-moodkin-dark">Email</p>
              <p className="text-sm text-moodkin-gray">{session?.user.email}</p>
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
            <div>
              <p className="font-medium text-moodkin-dark">Name</p>
              <p className="text-sm text-moodkin-gray">{session?.user.name || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-moodkin-dark">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-moodkin-cream/30">
            <div>
              <p className="font-medium text-moodkin-dark">Current Plan</p>
              <p className="text-sm text-moodkin-gray capitalize">
                {session?.user.subscriptionStatus || 'Free'}
              </p>
            </div>
            {session?.user.subscriptionStatus === 'trial' && (
              <Button className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full">
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
