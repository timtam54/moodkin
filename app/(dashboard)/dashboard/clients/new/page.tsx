'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientForm } from '@/components/clients/client-form'
import { useCreateClient } from '@/hooks/use-clients'

export default function NewClientPage() {
  const router = useRouter()
  const createClient = useCreateClient()

  function handleSubmit(data: { email: string; name?: string; phone?: string; address?: string; notes?: string }) {
    createClient.mutate(data, {
      onSuccess: () => router.push('/dashboard/clients'),
    })
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add New Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            onSubmit={handleSubmit}
            isLoading={createClient.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
