'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/utils'
import type { Conversation } from '@/types/database'

export default function ClientPortalPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchConversations()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-moodkin-dark">Your Moodboards</h1>
        <p className="text-moodkin-gray mt-1">View and collaborate on your moodboard sessions</p>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-2">
          {loading ? (
            <div className="py-12 text-center text-moodkin-gray">Loading...</div>
          ) : !conversations.length ? (
            <EmptyState
              icon={MessageSquare}
              title="No moodboards yet"
              description="Your photographer will send you an invite link when ready"
            />
          ) : (
            <div className="divide-y divide-moodkin-light-gray/50">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/projects/${conversation.id}`}
                  className="flex items-center justify-between py-3 px-4 hover:bg-moodkin-cream/50 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-moodkin-dark truncate">
                      {conversation.title}
                    </p>
                    <p className="text-sm text-moodkin-gray truncate mt-0.5">
                      {conversation.photographer?.name || 'Your photographer'}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-moodkin-gray ml-4">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRelativeTime(conversation.updated_at)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
