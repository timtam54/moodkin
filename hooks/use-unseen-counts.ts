import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export type TabType = 'project' | 'client' | 'creative' | 'links' | 'conversations'

export interface UnseenCounts {
  total: number
  client: number
  creative: number
  links: number
  conversations: number
}

export function useUnseenCounts() {
  return useQuery({
    queryKey: ['unseen-counts'],
    queryFn: async () => {
      const res = await fetch('/api/projects/unseen')
      if (!res.ok) throw new Error('Failed to fetch unseen counts')
      return res.json() as Promise<Record<string, UnseenCounts>>
    },
    // Refetch every 30 seconds to keep counts fresh
    refetchInterval: 30000,
  })
}

export function useMarkAsSeen(projectId: string) {
  const queryClient = useQueryClient()

  const markSeen = useCallback(async (tab: TabType = 'project') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab }),
      })
      if (res.ok) {
        // Invalidate unseen counts to refresh the badges
        queryClient.invalidateQueries({ queryKey: ['unseen-counts'] })
      }
    } catch (error) {
      console.error('Failed to mark as seen:', error)
    }
  }, [projectId, queryClient])

  return { markSeen }
}
