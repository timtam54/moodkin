import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectColour, ColourReaction, ColourComment } from '@/types/database'

export function useProjectColours(projectId: string) {
  return useQuery({
    queryKey: ['project-colours', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/colours`)
      if (!res.ok) throw new Error('Failed to fetch colours')
      return res.json() as Promise<ProjectColour[]>
    },
    enabled: !!projectId,
  })
}

export function useCreateProjectColour(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { hex_color: string; name?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/colours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create colour')
      return res.json() as Promise<ProjectColour>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-colours', projectId] })
    },
  })
}

export function useDeleteProjectColour(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (colourId: string) => {
      const res = await fetch(`/api/projects/${projectId}/colours?colourId=${colourId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete colour')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-colours', projectId] })
    },
  })
}

// Reactions hooks
export function useColourReactions(colourId: string) {
  return useQuery({
    queryKey: ['colour-reactions', colourId],
    queryFn: async () => {
      const res = await fetch(`/api/colours/${colourId}/reactions`)
      if (!res.ok) throw new Error('Failed to fetch reactions')
      return res.json() as Promise<ColourReaction[]>
    },
    enabled: !!colourId,
  })
}

export function useAddColourReaction(colourId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reactionType: 'like' | 'redflag') => {
      const res = await fetch(`/api/colours/${colourId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: reactionType }),
      })
      if (!res.ok) throw new Error('Failed to add reaction')
      return res.json() as Promise<ColourReaction>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colour-reactions', colourId] })
    },
  })
}

export function useRemoveColourReaction(colourId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reactionType: 'like' | 'redflag') => {
      const res = await fetch(`/api/colours/${colourId}/reactions?type=${reactionType}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove reaction')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colour-reactions', colourId] })
    },
  })
}

// Comments hooks
export function useColourComments(colourId: string) {
  return useQuery({
    queryKey: ['colour-comments', colourId],
    queryFn: async () => {
      const res = await fetch(`/api/colours/${colourId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      return res.json() as Promise<ColourComment[]>
    },
    enabled: !!colourId,
  })
}

export function useAddColourComment(colourId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/colours/${colourId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json() as Promise<ColourComment>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colour-comments', colourId] })
    },
  })
}
