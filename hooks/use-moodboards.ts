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

export interface MoodboardStyleOptions {
  backgroundColor?: string
  gridLayout?: string
  borderEnabled?: boolean
  borderColor?: string
  borderRadius?: number
  borderWidth?: number
  spacing?: number
  aspectRatio?: 'portrait' | 'square' | 'landscape'
  mode?: 'automatic' | 'manual'
  selectedAssetIds?: string[]
}

export function useCreateMoodboard(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (options?: MoodboardStyleOptions) => {
      const res = await fetch(`/api/conversations/${conversationId}/moodboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
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

export function useDeleteMoodboard(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (moodboardId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/moodboards?moodboardId=${moodboardId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete moodboard')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodboards', conversationId] })
    },
  })
}
