'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone } from 'lucide-react'
import type { User } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

// Placeholder avatar images
const avatarPlaceholders = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
]

function getPlaceholderAvatar(id: string): string {
  const index = id.charCodeAt(0) % avatarPlaceholders.length
  return avatarPlaceholders[index]
}

interface ClientCardProps {
  client: User
}

export function ClientCard({ client }: ClientCardProps) {
  const avatarUrl = client.avatar_url || getPlaceholderAvatar(client.id)
  const initials = (client.name || client.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="aspect-square relative rounded-2xl overflow-hidden group cursor-pointer bg-moodkin-cream"
    >
      <Image
        src={avatarUrl}
        alt={client.name || client.email}
        fill
        className="object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-base truncate">
          {client.name || 'Unnamed Client'}
        </p>
        <p className="text-white/80 text-sm truncate flex items-center gap-1 mt-1">
          <Mail className="w-3 h-3" />
          {client.email}
        </p>
        {client.phone && (
          <p className="text-white/70 text-xs truncate flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" />
            {client.phone}
          </p>
        )}
      </div>

      <div className="absolute top-3 right-3 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
        <span className="text-white/80 text-xs">
          {formatRelativeTime(client.created_at)}
        </span>
      </div>
    </Link>
  )
}
