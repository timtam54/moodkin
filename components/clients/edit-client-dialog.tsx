'use client'

import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ClientForm } from '@/components/clients/client-form'
import type { User } from '@/types/database'

interface EditClientDialogProps {
  open: boolean
  onClose: () => void
  client: User
  onSubmit: (data: { email: string; name?: string; phone?: string; address?: string; notes?: string; avatar_url?: string }) => void
  isLoading?: boolean
}

export function EditClientDialog({ open, onClose, client, onSubmit, isLoading }: EditClientDialogProps) {
  function handleSubmit(data: { email: string; name?: string; phone?: string; address?: string; notes?: string; avatar_url?: string }) {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogDescription>Update your client&apos;s information</DialogDescription>
      </DialogHeader>
      <ClientForm
        initialData={client}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </Dialog>
  )
}
