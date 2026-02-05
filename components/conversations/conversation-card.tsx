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
}

export function ConversationCard({ conversation }: ConversationCardProps) {
  const imageUrl = conversation.cover_image_url || getPlaceholderImage(conversation.id)

  return (
    <Link
      href={`/dashboard/projects/${conversation.id}`}
      className="aspect-square relative rounded-2xl overflow-hidden group cursor-pointer bg-moodkin-cream"
    >
      <Image
        src={imageUrl}
        alt={conversation.title}
        fill
        className="object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="absolute top-3 right-3">
        <Badge
          variant={conversation.status === 'active' ? 'success' : 'default'}
          className="backdrop-blur-sm"
        >
          {conversation.status}
        </Badge>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-base truncate">
          {conversation.title}
        </p>
        <p className="text-white/80 text-sm truncate flex items-center gap-1 mt-1">
          <MessageSquare className="w-3 h-3" />
          {conversation.status}
        </p>
        <p className="text-white/60 text-xs mt-1">
          {formatRelativeTime(conversation.updated_at)}
        </p>
      </div>
    </Link>
  )
}
