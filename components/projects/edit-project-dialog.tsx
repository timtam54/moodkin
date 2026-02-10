'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Loader2, User } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import Image from 'next/image'
import { useClients } from '@/hooks/use-clients'
import { useProjectUsers, useInviteUser, useRemoveProjectUser } from '@/hooks/use-project-users'

interface EditProjectDialogProps {
  open: boolean
  onClose: () => void
  project: {
    id: string
    title: string
    cover_image_url: string | null
  }
  onSubmit: (data: { title?: string; cover_image_url?: string }) => void
  isLoading: boolean
}

export function EditProjectDialog({ open, onClose, project, onSubmit, isLoading }: EditProjectDialogProps) {
  const [title, setTitle] = useState(project.title)
  const [coverUrl, setCoverUrl] = useState(project.cover_image_url || '')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isUpdatingClient, setIsUpdatingClient] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: clients } = useClients()
  const { data: projectUsers } = useProjectUsers(project.id)
  const inviteUser = useInviteUser(project.id)
  const removeUser = useRemoveProjectUser(project.id)

  // Find current client in project
  const currentClient = projectUsers?.find(pu => pu.role === 'client' && !pu.is_owner)

  // Sync title and cover when dialog opens or project changes
  useEffect(() => {
    if (open) {
      setTitle(project.title)
      setCoverUrl(project.cover_image_url || '')
    }
  }, [open, project.title, project.cover_image_url])

  // Set initial selected client when dialog opens or projectUsers loads
  useEffect(() => {
    if (currentClient?.user_id) {
      setSelectedClientId(currentClient.user_id)
    } else {
      setSelectedClientId('')
    }
  }, [currentClient?.user_id])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setCoverUrl(blob.url)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setIsUpdatingClient(true)
    try {
      // Handle client change
      const currentClientUserId = currentClient?.user_id
      if (selectedClientId !== (currentClientUserId || '')) {
        // Remove old client if exists
        if (currentClient) {
          await removeUser.mutateAsync(currentClient.id)
        }
        // Add new client if selected
        if (selectedClientId) {
          const selectedClient = clients?.find(c => c.id === selectedClientId)
          if (selectedClient) {
            await inviteUser.mutateAsync({ email: selectedClient.email, role: 'client' })
          }
        }
      }

      // Handle project updates
      const updates: { title?: string; cover_image_url?: string } = {}
      if (title !== project.title) {
        updates.title = title
      }
      if (coverUrl !== (project.cover_image_url || '')) {
        updates.cover_image_url = coverUrl
      }

      if (Object.keys(updates).length > 0) {
        onSubmit(updates)
      } else {
        onClose()
      }
    } finally {
      setIsUpdatingClient(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Project</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-moodkin-dark mb-2">
            Cover Image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-video bg-moodkin-light-gray rounded-xl overflow-hidden cursor-pointer group"
          >
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="Cover"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-moodkin-gray">No cover image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <div className="text-center text-white">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Change Cover</span>
                </div>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-moodkin-dark mb-2">
            Project Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter project title"
            required
          />
        </div>

        {/* Client Selection */}
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-moodkin-dark mb-2">
            Client
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moodkin-gray/50 pointer-events-none" />
            <select
              id="client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-moodkin-light-gray bg-white text-moodkin-dark focus:outline-none focus:ring-2 focus:ring-moodkin-gold focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">No client assigned</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name || client.email}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-moodkin-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {currentClient && currentClient.invite_status === 'pending' && (
            <p className="text-xs text-amber-600 mt-1">Current client invite is pending</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isUpdatingClient}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isLoading || isUploading || isUpdatingClient}>
            {isLoading || isUpdatingClient ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
