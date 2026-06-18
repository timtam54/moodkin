'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, FolderOpen, FolderPlus, CheckCircle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { ConversationCard } from '@/components/conversations/conversation-card'
import { useConversations } from '@/hooks/use-conversations'
import { useUnseenCounts } from '@/hooks/use-unseen-counts'
import { useSession } from '@/hooks/use-session'
import { Dialog } from '@/components/ui/dialog'
import { PaymentDialog } from '@/components/payment/payment-dialog'
import { isSubscriptionActive, subscriptionConfig, formatPrice } from '@/lib/config/subscription'

export default function ProjectsPage() {
  const { data: projects, isLoading } = useConversations()
  const { data: unseenCounts } = useUnseenCounts()
  const { session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const user = session?.user
  const hasActiveSubscription = isSubscriptionActive(
    user?.stripeid,
    user?.subscriptionEndsAt,
    user?.googlePlayPurchaseToken,
  )
  const projectCount = projects?.length || 0
  const maxFreeProjects = subscriptionConfig.freeTier.maxProjects

  const handleNewProjectClick = () => {
    if (!hasActiveSubscription && projectCount >= maxFreeProjects) {
      setShowUpgradeDialog(true)
    } else {
      router.push('/dashboard/projects/new')
    }
  }

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(false)
    setShowPaymentDialog(true)
  }

  const handlePaymentSuccess = async (customerId: string) => {
    try {
      const response = await fetch('/api/user/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeid: customerId }),
      })
      if (response.ok) {
        setShowPaymentDialog(false)
        router.push('/dashboard/projects/new')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update subscription:', error)
    }
  }

  // Handle subscription success redirect from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription')
    if (subscriptionStatus === 'success') {
      // Verify and sync subscription with database
      fetch('/api/stripe/verify-subscription', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.subscribed) {
            setShowSuccess(true)
            // Reload page after showing success to refresh subscription status everywhere
            setTimeout(() => {
              window.location.href = '/dashboard/projects'
            }, 3000)
          } else {
            // If not subscribed, might be a timing issue - try again
            console.log('Subscription verification returned:', data)
          }
        })
        .catch(err => {
          console.error('Subscription verification error:', err)
        })
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Subscription Success Banner */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Welcome to Moodkin Premium!</p>
            <p className="text-sm text-green-700">Your subscription is now active. Enjoy unlimited projects and AI image generation.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Projects</h1>
          <p className="text-moodkin-gray mt-1">Moodboard sessions</p>
        </div>
        <Button variant="primary" onClick={handleNewProjectClick} data-tour="new-project">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <Loading message="Loading projects..." />
      ) : !projects?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Start a moodboard project with a client"
            action={
              <Button variant="primary" size="sm" onClick={handleNewProjectClick}>
                <Plus className="w-4 h-4 mr-1" />
                New Project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* New Project Card */}
          <button
            onClick={handleNewProjectClick}
            className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-moodkin-gold-hover transition-colors"
          >
            <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
              <FolderPlus className="w-8 h-8 text-moodkin-dark" />
            </div>
            <p className="font-bold text-moodkin-dark text-center text-sm">NEW</p>
            <p className="font-bold text-moodkin-dark text-center text-sm">PROJECT</p>
          </button>

          {/* Project Cards */}
          {projects.map((project) => (
            <ConversationCard
              key={project.id}
              conversation={project}
              unseenCount={unseenCounts?.[project.id]?.total}
            />
          ))}
        </div>
      )}

      {/* Upgrade Required Dialog */}
      <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-moodkin-gold/20 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-moodkin-gold" />
          </div>
          <h2 className="text-xl font-bold text-moodkin-dark mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-moodkin-gray mb-6">
            Free accounts are limited to {maxFreeProjects} projects. Upgrade to Premium to create more projects.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpgradeDialog(false)}
              className="px-4 py-2 border border-moodkin-light-gray hover:bg-moodkin-cream text-moodkin-dark font-medium rounded-xl transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgradeClick}
              className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
            >
              <Crown className="w-4 h-4" />
              Subscribe - {formatPrice()}/month
            </button>
          </div>
        </div>
      </Dialog>

      {/* Payment Dialog */}
      {user && (
        <PaymentDialog
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          username={user.name || user.email}
          email={user.email}
          amount={subscriptionConfig.price}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
