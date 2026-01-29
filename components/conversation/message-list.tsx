'use client'

import { useEffect, useRef } from 'react'
import { Palette } from 'lucide-react'
import type { Message } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Start the conversation!
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-4">
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId
        const isCanvas = !!message.canvas_data && !message.text_content

        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {isCanvas ? (
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="w-4 h-4" />
                  <span className={isOwn ? 'text-blue-100' : 'text-gray-500'}>
                    Canvas updated
                  </span>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.text_content}</p>
              )}
              <p
                className={`text-xs mt-1 ${
                  isOwn ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {formatRelativeTime(message.created_at)}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
