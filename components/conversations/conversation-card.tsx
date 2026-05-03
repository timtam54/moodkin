'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import type { Conversation } from '@/types/database'

// Placeholder images for conversations
const conversationPlaceholders = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80',
]

function getPlaceholderImage(id: string): string {
  const index = id.charCodeAt(0) % conversationPlaceholders.length
  return conversationPlaceholders[index]
}

interface ConversationCardProps {
  conversation: Conversation
  unseenCount?: number
}

export function ConversationCard({ conversation, unseenCount }: ConversationCardProps) {
  const imageUrl = conversation.cover_image_url || getPlaceholderImage(conversation.id)

  return (
    <Link
      href={`/dashboard/projects/${conversation.id}`}
      className="aspect-square relative rounded-2xl overflow-hidden group cursor-pointer bg-moodkin-cream shadow-md hover:shadow-xl transition-all duration-300 ring-1 ring-black/5"
    >
      <Image
        src={imageUrl}
        alt={conversation.title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Notification badge - top right */}
      {unseenCount && unseenCount > 0 ? (
        <div className="absolute top-2 right-2">
          <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center shadow-lg">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        </div>
      ) : null}

      {/* Clean bottom info area */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-semibold text-sm leading-tight truncate mb-1">
          {conversation.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs">
            {formatRelativeTime(conversation.updated_at)}
          </span>
          <Badge
            variant={conversation.status === 'active' ? 'success' : 'default'}
            className="backdrop-blur-sm text-[10px] px-1.5 py-0.5"
          >
            {conversation.status}
          </Badge>
        </div>
      </div>
    </Link>
  )
}
