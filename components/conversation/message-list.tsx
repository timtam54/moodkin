'use client'

import { useEffect, useRef } from 'react'
import { Palette } from 'lucide-react'
import type { Message } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  senderMap?: Map<string, string>
}

export function MessageList({ messages, currentUserId, senderMap }: MessageListProps) {
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
      {messages.map((message, index) => {
        const isOwn = message.sender_id === currentUserId
        const isCanvas = !!message.canvas_data && !message.text_content
        const prevMessage = index > 0 ? messages[index - 1] : null
        const showSender = senderMap && !isOwn && message.sender_id !== prevMessage?.sender_id

        return (
          <div
            key={message.id}
            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
          >
            {showSender && (
              <span className="text-xs text-gray-400 mb-1 px-1">
                {senderMap.get(message.sender_id) || 'Unknown'}
              </span>
            )}
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
