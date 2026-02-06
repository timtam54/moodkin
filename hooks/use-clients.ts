import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User, Conversation } from '@/types/database'

export function useClients(search?: string) {
  return useQuery({
    queryKey: ['clients', { search }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json() as Promise<User[]>
    },
  })
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client')
      return res.json() as Promise<User>
    },
    enabled: !!clientId,
  })
}

export function useUpdateClient(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<{ email: string; name: string; phone: string; address: string; notes: string; avatar_url: string }>) => {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update client')
      return res.json() as Promise<User>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] })
    },
  })
}

export function useClientProjects(clientId: string) {
  return useQuery({
    queryKey: ['clients', clientId, 'projects'],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/projects`)
      if (!res.ok) throw new Error('Failed to fetch client projects')
      return res.json() as Promise<Conversation[]>
    },
    enabled: !!clientId,
  })
}
