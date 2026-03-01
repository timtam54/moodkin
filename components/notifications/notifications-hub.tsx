'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageSquare, Image, Heart, Flag, MessageCircle, Palette, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import type { NotificationItem, NotificationType } from '@/app/api/notifications/route'

interface NotificationsHubProps {
  className?: string
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  message: MessageSquare,
  asset: Image,
  asset_comment: MessageCircle,
  asset_reaction: Heart,
  colour_comment: Palette,
  colour_reaction: Palette,
}

const typeColors: Record<NotificationType, string> = {
  message: 'bg-blue-100 text-blue-600',
  asset: 'bg-green-100 text-green-600',
  asset_comment: 'bg-purple-100 text-purple-600',
  asset_reaction: 'bg-pink-100 text-pink-600',
  colour_comment: 'bg-orange-100 text-orange-600',
  colour_reaction: 'bg-orange-100 text-orange-600',
}

export function NotificationsHub({ className }: NotificationsHubProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnseenCount(data.unseenCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = (notification: NotificationItem) => {
    // Navigate to the project with the appropriate tab
    const tab = notification.tab || 'project'
    router.push(`/dashboard/projects/${notification.projectId}?tab=${tab}`)
    setIsOpen(false)
  }

  const getIcon = (type: NotificationType) => {
    if (type === 'asset_reaction' || type === 'colour_reaction') {
      // Check if it's a flag reaction based on content
      const IconComponent = typeIcons[type]
      return IconComponent
    }
    return typeIcons[type]
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-red-500 text-white rounded-full">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-moodkin-light-gray overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-moodkin-light-gray bg-moodkin-cream/50">
            <h3 className="font-semibold text-moodkin-dark">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-moodkin-gray hover:text-moodkin-dark rounded-lg hover:bg-moodkin-light-gray/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-moodkin-gray">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-moodkin-gray">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">Activity from your projects will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-moodkin-light-gray/50">
                {notifications.map((notification) => {
                  const IconComponent = getIcon(notification.type)
                  const isReactionFlag = (notification.type === 'asset_reaction' || notification.type === 'colour_reaction')
                    && notification.content.toLowerCase().includes('flag')

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-moodkin-cream/50 transition-colors',
                        notification.isNew && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          typeColors[notification.type]
                        )}>
                          {isReactionFlag ? (
                            <Flag className="w-4 h-4" />
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-moodkin-dark">
                              <span className="font-medium">
                                {notification.actorName || 'Someone'}
                              </span>
                            </p>
                            {notification.isNew && (
                              <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-moodkin-gray mt-0.5 line-clamp-2">
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-moodkin-gray/70">
                              {notification.projectTitle}
                            </span>
                            <span className="text-xs text-moodkin-gray/50">•</span>
                            <span className="text-xs text-moodkin-gray/70">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-moodkin-light-gray bg-moodkin-cream/30">
              <p className="text-xs text-moodkin-gray text-center">
                Showing last 7 days of activity
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
