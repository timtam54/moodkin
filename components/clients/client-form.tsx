'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/upload/image-upload'
import type { User } from '@/types/database'

interface ClientFormProps {
  initialData?: Partial<User>
  onSubmit: (data: { email: string; name?: string; phone?: string; address?: string; notes?: string; avatar_url?: string }) => void
  isLoading?: boolean
}

export function ClientForm({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const [email, setEmail] = useState(initialData?.email || '')
  const [name, setName] = useState(initialData?.name || '')
  const [phone, setPhone] = useState(initialData?.phone || '')
  const [address, setAddress] = useState(initialData?.address || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      email,
      name: name || undefined,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
      avatar_url: avatarUrl || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">Client Photo</label>
        <ImageUpload
          initialUrl={initialData?.avatar_url}
          onUploadComplete={(url) => setAvatarUrl(url)}
          onClear={() => setAvatarUrl('')}
          onError={(error) => console.error(error)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">
          Email <span className="text-moodkin-gold">*</span>
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
        <label className="block text-sm font-medium text-moodkin-dark mb-2">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-moodkin-dark mb-2">Phone</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-moodkin-dark mb-2">Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this client..."
          className="w-full px-4 py-2.5 border border-moodkin-light-gray rounded-xl text-sm text-moodkin-dark placeholder:text-moodkin-gray/60 focus:outline-none focus:ring-2 focus:ring-moodkin-gold/50 focus:border-moodkin-gold transition-colors resize-none"
          rows={3}
        />
      </div>
      <Button type="submit" variant="primary" className="w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Saving...' : initialData?.id ? 'Update Client' : 'Add Client'}
      </Button>
    </form>
  )
}
