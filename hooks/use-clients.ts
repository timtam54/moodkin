import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Client } from '@/types/database'

export function useClients(search?: string) {
  return useQuery({
    queryKey: ['clients', { search }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json() as Promise<Client[]>
    },
  })
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client')
      return res.json() as Promise<Client>
    },
    enabled: !!clientId,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { email: string; name?: string; phone?: string; address?: string; notes?: string }) => {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create client')
      return res.json() as Promise<Client>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<{ email: string; name: string; phone: string; address: string; notes: string }>) => {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update client')
      return res.json() as Promise<Client>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (clientId: string) => {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete client')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}
