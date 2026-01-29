'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Client } from '@/types/database'

interface ClientFormProps {
  initialData?: Partial<Client>
  onSubmit: (data: { email: string; name?: string; phone?: string; address?: string; notes?: string }) => void
  isLoading?: boolean
}

export function ClientForm({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const [email, setEmail] = useState(initialData?.email || '')
  const [name, setName] = useState(initialData?.name || '')
  const [phone, setPhone] = useState(initialData?.phone || '')
  const [address, setAddress] = useState(initialData?.address || '')
  const [notes, setNotes] = useState(initialData?.notes || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      email,
      name: name || undefined,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="client@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this client..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>
      <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : initialData?.id ? 'Update Client' : 'Add Client'}
      </Button>
    </form>
  )
}
