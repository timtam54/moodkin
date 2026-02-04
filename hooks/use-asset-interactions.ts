import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AssetReaction, AssetComment } from '@/types/database'

// Reactions hooks
export function useAssetReactions(assetId: string) {
  return useQuery({
    queryKey: ['asset-reactions', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/reactions`)
      if (!res.ok) throw new Error('Failed to fetch reactions')
      return res.json() as Promise<AssetReaction[]>
    },
    enabled: !!assetId,
  })
}

export function useAddReaction(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reactionType: 'like' | 'redflag') => {
      const res = await fetch(`/api/assets/${assetId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: reactionType }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add reaction')
      }
      return res.json() as Promise<AssetReaction>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-reactions', assetId] })
    },
  })
}

export function useRemoveReaction(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reactionType: 'like' | 'redflag') => {
      const res = await fetch(`/api/assets/${assetId}/reactions?type=${reactionType}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove reaction')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-reactions', assetId] })
    },
  })
}

// Comments hooks
export function useAssetComments(assetId: string) {
  return useQuery({
    queryKey: ['asset-comments', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      return res.json() as Promise<AssetComment[]>
    },
    enabled: !!assetId,
  })
}

export function useAddComment(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/assets/${assetId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json() as Promise<AssetComment>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-comments', assetId] })
    },
  })
}

export function useDeleteComment(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/assets/${assetId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-comments', assetId] })
    },
  })
}
