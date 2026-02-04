'use client'

import { useState, useRef, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { Plus, X, Loader2, ImageIcon } from 'lucide-react'

interface UploadedImage {
  id: string
  url: string
  name: string
}

interface PendingUpload {
  id: string
  file: File
  preview: string
  progress: 'pending' | 'uploading' | 'complete' | 'error'
  url?: string
  error?: string
}

interface MultiImageUploadProps {
  onImagesChange?: (images: UploadedImage[]) => void
  initialImages?: UploadedImage[]
  maxFiles?: number
  maxSizeMB?: number
  className?: string
}

export function MultiImageUpload({
  onImagesChange,
  initialImages = [],
  maxFiles = 20,
  maxSizeMB = 10,
  className = '',
}: MultiImageUploadProps) {
  const [uploads, setUploads] = useState<PendingUpload[]>(() =>
    initialImages.map((img) => ({
      id: img.id,
      file: new File([], img.name),
      preview: img.url,
      progress: 'complete' as const,
      url: img.url,
    }))
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (pending: PendingUpload) => {
    try {
      setUploads((prev) =>
        prev.map((u) => (u.id === pending.id ? { ...u, progress: 'uploading' } : u))
      )

      const blob = await upload(pending.file.name, pending.file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      setUploads((prev) =>
        prev.map((u) =>
          u.id === pending.id ? { ...u, progress: 'complete', url: blob.url } : u
        )
      )

      return blob.url
    } catch (error) {
      console.error('Upload failed:', error)
      setUploads((prev) =>
        prev.map((u) =>
          u.id === pending.id ? { ...u, progress: 'error', error: 'Upload failed' } : u
        )
      )
      return null
    }
  }

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files) return

    const maxBytes = maxSizeMB * 1024 * 1024
    const validFiles: PendingUpload[] = []

    const remainingSlots = maxFiles - uploads.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    for (const file of filesToProcess) {
      if (file.size > maxBytes) {
        console.warn(`${file.name} exceeds ${maxSizeMB}MB limit`)
        continue
      }

      const preview = URL.createObjectURL(file)
      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview,
        progress: 'pending',
      })
    }

    setUploads((prev) => [...prev, ...validFiles])

    // Upload all files
    const uploadPromises = validFiles.map((pending) => uploadFile(pending))
    await Promise.all(uploadPromises)

    // Notify parent of completed uploads
    setUploads((current) => {
      const completed = current
        .filter((u) => u.progress === 'complete' && u.url)
        .map((u) => ({ id: u.id, url: u.url!, name: u.file.name }))
      onImagesChange?.(completed)
      return current
    })
  }

  const handleRemove = useCallback(
    (id: string) => {
      setUploads((prev) => {
        const updated = prev.filter((u) => u.id !== id)
        const completed = updated
          .filter((u) => u.progress === 'complete' && u.url)
          .map((u) => ({ id: u.id, url: u.url!, name: u.file.name }))
        onImagesChange?.(completed)
        return updated
      })
    },
    [onImagesChange]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFilesSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const canAddMore = uploads.length < maxFiles

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-moodkin-light-gray group"
          >
            <img
              src={upload.preview}
              alt=""
              className="w-full h-full object-cover"
            />
            {upload.progress === 'uploading' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            {upload.progress === 'error' && (
              <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                <span className="text-white text-xs px-2 text-center">
                  {upload.error}
                </span>
              </div>
            )}
            <button
              onClick={() => handleRemove(upload.id)}
              className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-moodkin-light-gray rounded-lg cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-gold/5 transition-colors"
          >
            <Plus className="w-8 h-8 text-moodkin-gray" />
            <span className="text-xs text-moodkin-gray mt-1">Add images</span>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(e) => handleFilesSelect(e.target.files)}
            />
          </label>
        )}
      </div>

      {uploads.length === 0 && (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="mt-4 flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-moodkin-light-gray rounded-lg cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-gold/5 transition-colors"
        >
          <ImageIcon className="w-10 h-10 text-moodkin-gray mb-2" />
          <p className="text-sm text-moodkin-gray">
            <span className="font-medium text-moodkin-dark">Click to upload</span> or drag
            and drop
          </p>
          <p className="text-xs text-moodkin-gray mt-1">
            Up to {maxFiles} images, max {maxSizeMB}MB each
          </p>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={(e) => handleFilesSelect(e.target.files)}
          />
        </label>
      )}
    </div>
  )
}
