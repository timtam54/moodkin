'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Palette, X } from 'lucide-react'
import type { Message } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  senderMap?: Map<string, string>
}

// Convert URLs in text to clickable links
function renderTextWithLinks(text: string, isOwn: boolean) {
  // Match URLs with http(s):// or starting with www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]+)/gi
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're testing again
      urlRegex.lastIndex = 0
      // Add https:// prefix if URL starts with www.
      const href = part.startsWith('www.') ? `https://${part}` : part
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all ${isOwn ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export function MessageList({ messages, currentUserId, senderMap }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

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
    <>
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId
          const isCanvas = !!message.canvas_data && !message.text_content && !message.image_url
          const hasImage = !!message.image_url
          const prevMessage = index > 0 ? messages[index - 1] : null
          const showSender = message.sender_id !== prevMessage?.sender_id

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              {showSender && (
                <span className="text-xs text-gray-400 mb-1 px-1">
                  {isOwn ? 'Me' : (senderMap?.get(message.sender_id) || 'Unknown')}
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-lg ${hasImage ? 'overflow-hidden' : 'px-3 py-2'} ${
                  isOwn
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {hasImage && (
                  <button
                    onClick={() => setLightboxImage(message.image_url)}
                    className="block w-full"
                  >
                    <div className="relative w-64 h-48">
                      <Image
                        src={message.image_url!}
                        alt="Shared image"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </button>
                )}
                {message.text_content && (
                  <p className={`text-sm whitespace-pre-wrap ${hasImage ? 'px-3 pt-2' : ''}`}>
                    {renderTextWithLinks(message.text_content, isOwn)}
                  </p>
                )}
                {isCanvas && (
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="w-4 h-4" />
                    <span className={isOwn ? 'text-blue-100' : 'text-gray-500'}>
                      Canvas updated
                    </span>
                  </div>
                )}
                <p
                  className={`text-xs mt-1 ${hasImage ? 'px-3 pb-2' : ''} ${
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

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Image
              src={lightboxImage}
              alt="Full size image"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
