'use client'

import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/database'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SubscriptionBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function UserTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-moodkin-gray text-sm">-</span>
  const colors: Record<string, string> = {
    creative: 'bg-purple-100 text-purple-800',
    client: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  )
}

interface AdminUsersTableProps {
  users: User[]
  currentUserId: string
}

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const [impersonating, setImpersonating] = useState<string | null>(null)

  async function handleImpersonate(userId: string) {
    setImpersonating(userId)
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        // Hard reload to clear all React Query cache and client state
        window.location.href = '/dashboard'
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to impersonate user')
      }
    } catch {
      alert('Failed to impersonate user')
    } finally {
      setImpersonating(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-moodkin-cream/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-moodkin-cream/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.email}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-moodkin-gold flex items-center justify-center">
                        <span className="text-moodkin-dark font-semibold text-sm">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-moodkin-dark">
                        {user.name || 'No name'}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs text-moodkin-gray">(you)</span>
                        )}
                      </p>
                      <p className="text-sm text-moodkin-gray">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <UserTypeBadge type={user.creative_client} />
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <SubscriptionBadge status={user.subscription_status} />
                    {user.subscription_ends_at && (
                      <p className="text-xs text-moodkin-gray">
                        Ends: {formatDate(user.subscription_ends_at)}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-moodkin-gray capitalize">
                    {user.auth_provider || '-'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-moodkin-gray">
                    {formatDate(user.created_at)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {user.id !== currentUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonate(user.id)}
                      disabled={impersonating === user.id}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      {impersonating === user.id ? 'Switching...' : 'Impersonate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
