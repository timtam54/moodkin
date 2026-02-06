import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectUserWithUser, ProjectUserRole } from '@/types/database'

// Fetch project users
export function useProjectUsers(projectId: string) {
  return useQuery({
    queryKey: ['project-users', projectId],
    queryFn: async (): Promise<ProjectUserWithUser[]> => {
      const res = await fetch(`/api/projects/${projectId}/users`)
      if (!res.ok) {
        throw new Error('Failed to fetch project users')
      }
      return res.json()
    },
    enabled: !!projectId,
  })
}

// Invite user to project
export function useInviteUser(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: ProjectUserRole }) => {
      const res = await fetch(`/api/projects/${projectId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-users', projectId] })
    },
  })
}

// Update a project user's role
export function useUpdateProjectUserRole(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: ProjectUserRole }) => {
      const res = await fetch(`/api/projects/${projectId}/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-users', projectId] })
    },
  })
}

// Remove user from project
export function useRemoveProjectUser(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/users?userId=${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove user')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-users', projectId] })
    },
  })
}

// Resend invite email
export function useResendInvite(projectId: string) {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/users/${userId}/resend`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to resend invite')
      }

      return res.json()
    },
  })
}
