import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectNote } from '@/types/database'

type NoteResponse = ProjectNote | { content: string; conversation_id: string }

export function useProjectNote(projectId: string) {
  return useQuery({
    queryKey: ['project-note', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notes`)
      if (!res.ok) throw new Error('Failed to fetch note')
      return res.json() as Promise<NoteResponse>
    },
    enabled: !!projectId,
  })
}

export function useUpdateProjectNote(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      return res.json() as Promise<ProjectNote>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project-note', projectId], data)
    },
  })
}
