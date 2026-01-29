'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/components/clients/client-form'
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks/use-clients'

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()
  const { data: client, isLoading } = useClient(clientId)
  const updateClient = useUpdateClient(clientId)
  const deleteClient = useDeleteClient()

  function handleSubmit(data: { email: string; name?: string; phone?: string; address?: string; notes?: string }) {
    updateClient.mutate(data, {
      onSuccess: () => router.push('/dashboard/clients'),
    })
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this client? This will also delete all their conversations.')) return
    deleteClient.mutate(clientId, {
      onSuccess: () => router.push('/dashboard/clients'),
    })
  }

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>
  }

  if (!client) {
    return <div className="py-12 text-center text-gray-500">Client not found</div>
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to clients
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            initialData={client}
            onSubmit={handleSubmit}
            isLoading={updateClient.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
