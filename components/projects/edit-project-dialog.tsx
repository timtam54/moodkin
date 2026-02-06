'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Loader2 } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import Image from 'next/image'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isLoading || isUploading}>
            {isLoading ? (
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
