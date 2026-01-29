import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Conversation, Client } from '@/types/database'

export type ConversationWithClient = Conversation & {
  client: Pick<Client, 'id' | 'name' | 'email'>
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations')
      if (!res.ok) throw new Error('Failed to fetch conversations')
      return res.json() as Promise<ConversationWithClient[]>
    },
  })
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}`)
      if (!res.ok) throw new Error('Failed to fetch conversation')
      return res.json()
    },
    enabled: !!conversationId,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { client_id: string; title: string; category_id?: string }) => {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create conversation')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

export function useUpdateConversation(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { title?: string; status?: string; category_id?: string | null }) => {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update conversation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
  })
}
