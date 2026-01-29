import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Message } from '@/types/database'
import type { Json } from '@/types/database'

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      return res.json() as Promise<Message[]>
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  })
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { text_content?: string; canvas_data?: Json }) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to send message')
      return res.json() as Promise<Message>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
  })
}

export function useLatestCanvasData(messages: Message[] | undefined) {
  if (!messages) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].canvas_data) {
      return messages[i].canvas_data
    }
  }
  return null
}
