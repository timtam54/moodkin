import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MoodboardWithImages } from '@/types/database'

export function useMoodboards(conversationId: string) {
  return useQuery({
    queryKey: ['moodboards', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/moodboards`)
      if (!res.ok) throw new Error('Failed to fetch moodboards')
      return res.json() as Promise<MoodboardWithImages[]>
    },
    enabled: !!conversationId,
  })
}

export function useCreateMoodboard(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/moodboards`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create moodboard')
      }
      return res.json() as Promise<MoodboardWithImages>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodboards', conversationId] })
    },
  })
}
