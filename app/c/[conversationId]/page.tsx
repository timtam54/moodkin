'use client'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MessageList } from '@/components/conversation/message-list'
import { MessageInput } from '@/components/conversation/message-input'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { useConversation } from '@/hooks/use-conversations'
import { useMessages, useSendMessage, useLatestCanvasData } from '@/hooks/use-messages'
import { Loading } from '@/components/ui/loading'
import { useSession } from '@/hooks/use-session'
import type { Json } from '@/types/database'

const TldrawCanvas = dynamic(
  () => import('@/components/canvas/tldraw-canvas').then((m) => ({ default: m.TldrawCanvas })),
  { ssr: false, loading: () => <div className="w-full h-full min-h-[500px] bg-gray-50 rounded-lg animate-pulse" /> }
)

export default function ClientConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { session } = useSession()
  const { data: conversation, isLoading } = useConversation(conversationId)
  const { data: messages } = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId)

  const latestCanvasData = useLatestCanvasData(messages)

  function handleSendText(text: string) {
    sendMessage.mutate({ text_content: text })
  }

  async function handleSaveCanvas(data: unknown) {
    await sendMessage.mutateAsync({ canvas_data: data as Json })
  }

  if (isLoading) {
    return <Loading message="Loading conversation..." />
  }

  if (!conversation) {
    return <div className="py-12 text-center text-gray-500">Conversation not found</div>
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="pb-4 border-b">
        <h1 className="text-lg font-semibold text-gray-900">{conversation.title}</h1>
        <p className="text-sm text-gray-500">
          with {conversation.photographer?.name || 'your photographer'}
        </p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 mt-4 min-h-0">
        {/* Canvas panel (primary for client) */}
        <div className="flex-1 flex flex-col min-w-0 order-1 md:order-1">
          <div className="flex-1">
            <TldrawCanvas initialData={latestCanvasData} />
          </div>
          <CanvasToolbar onSave={handleSaveCanvas} />
        </div>

        {/* Messages panel */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col border rounded-lg bg-white order-2 md:order-2 max-h-64 md:max-h-none">
          <MessageList
            messages={messages || []}
            currentUserId={session?.user?.id || ''}
          />
          <MessageInput
            onSend={handleSendText}
            disabled={sendMessage.isPending}
          />
        </div>
      </div>
    </div>
  )
}
