'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen, FolderPlus, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { ConversationCard } from '@/components/conversations/conversation-card'
import { useConversations } from '@/hooks/use-conversations'
import { useUnseenCounts } from '@/hooks/use-unseen-counts'

export default function ProjectsPage() {
  const { data: projects, isLoading } = useConversations()
  const { data: unseenCounts } = useUnseenCounts()
  const searchParams = useSearchParams()
  const [showSuccess, setShowSuccess] = useState(false)

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
          <p className="text-moodkin-gray mt-1">Moodboard sessions with your clients</p>
        </div>
        <Link href="/dashboard/projects/new" data-tour="new-project">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
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
              <Link href="/dashboard/projects/new">
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* New Project Card */}
          <Link
            href="/dashboard/projects/new"
            className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-moodkin-gold-hover transition-colors"
          >
            <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
              <FolderPlus className="w-8 h-8 text-moodkin-dark" />
            </div>
            <p className="font-bold text-moodkin-dark text-center text-sm">NEW</p>
            <p className="font-bold text-moodkin-dark text-center text-sm">PROJECT</p>
          </Link>

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
    </div>
  )
}
