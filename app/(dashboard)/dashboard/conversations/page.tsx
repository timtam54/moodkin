'use client'

import Link from 'next/link'
import { Plus, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useConversations } from '@/hooks/use-conversations'
import { formatRelativeTime } from '@/lib/utils'

export default function ConversationsPage() {
  const { data: conversations, isLoading } = useConversations()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Conversations</h1>
          <p className="text-moodkin-gray mt-1">Moodboard sessions with your clients</p>
        </div>
        <Link href="/dashboard/conversations/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-2">
          {isLoading ? (
            <div className="py-12 text-center text-moodkin-gray">Loading...</div>
          ) : !conversations?.length ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description="Start a moodboard conversation with a client"
              action={
                <Link href="/dashboard/conversations/new">
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New Conversation
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-moodkin-light-gray/50">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/conversations/${conversation.id}`}
                  className="flex items-center justify-between py-3 px-4 hover:bg-moodkin-cream/50 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-moodkin-dark truncate">
                        {conversation.title}
                      </p>
                      <Badge variant={conversation.status === 'active' ? 'success' : 'default'}>
                        {conversation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-moodkin-gray truncate mt-0.5">
                      {conversation.client?.name || conversation.client?.email}
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
