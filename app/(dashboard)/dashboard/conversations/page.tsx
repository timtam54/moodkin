'use client'

import Link from 'next/link'
import { Plus, MessageSquare, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConversationCard } from '@/components/conversations/conversation-card'
import { useConversations } from '@/hooks/use-conversations'

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

      {isLoading ? (
        <div className="py-12 text-center text-moodkin-gray">Loading...</div>
      ) : !conversations?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-8">
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
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* New Conversation Card */}
          <Link
            href="/dashboard/conversations/new"
            className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-moodkin-gold-hover transition-colors"
          >
            <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
              <MessageSquarePlus className="w-8 h-8 text-moodkin-dark" />
            </div>
            <p className="font-bold text-moodkin-dark text-center text-sm">NEW</p>
            <p className="font-bold text-moodkin-dark text-center text-sm">CONVERSATION</p>
          </Link>

          {/* Conversation Cards */}
          {conversations.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  )
}
