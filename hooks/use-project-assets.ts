import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectAsset } from '@/types/database'

export function useProjectAssets(conversationId: string) {
  return useQuery({
    queryKey: ['project-assets', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/assets`)
      if (!res.ok) throw new Error('Failed to fetch assets')
      return res.json() as Promise<ProjectAsset[]>
    },
    enabled: !!conversationId,
  })
}

export function useCreateProjectAsset(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      url: string
      filename: string
      asset_type?: 'image' | 'link'
      title?: string
      thumbnail_url?: string | null
    }) => {
      const res = await fetch(`/api/conversations/${conversationId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save asset')
      return res.json() as Promise<ProjectAsset>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', conversationId] })
    },
  })
}

export function useDeleteProjectAsset(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assetId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/assets?assetId=${assetId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete asset')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', conversationId] })
    },
  })
}

export function useUpdateAssetCreative(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { assetId: string; creative: boolean }) => {
      const res = await fetch(`/api/conversations/${conversationId}/assets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update asset')
      return res.json() as Promise<ProjectAsset>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', conversationId] })
    },
  })
}
