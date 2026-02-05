import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import type { User } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

interface ClientListItemProps {
  client: User
}

export function ClientListItem({ client }: ClientListItemProps) {
  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">
          {client.name || client.email}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center text-sm text-gray-500">
            <Mail className="w-3 h-3 mr-1" />
            {client.email}
          </span>
          {client.phone && (
            <span className="flex items-center text-sm text-gray-500">
              <Phone className="w-3 h-3 mr-1" />
              {client.phone}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400 ml-4">
        {formatRelativeTime(client.created_at)}
      </span>
    </Link>
  )
}
