import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectFile } from '@/types/database'

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/files`)
      if (!res.ok) throw new Error('Failed to fetch files')
      return res.json() as Promise<ProjectFile[]>
    },
    enabled: !!projectId,
  })
}

type CreateFileInput = {
  url: string
  filename: string
  mime_type?: string
  size_bytes?: number
}

export function useCreateProjectFile(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateFileInput) => {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save file')
      return res.json() as Promise<ProjectFile>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] })
    },
  })
}

export function useDeleteProjectFile(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/projects/${projectId}/files?fileId=${fileId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete file')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] })
    },
  })
}
