'use client'

import { useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  onUploadComplete?: (url: string) => void
  onError?: (error: string) => void
  onClear?: () => void
  className?: string
  maxSizeMB?: number
  accept?: string
  initialUrl?: string | null
}

export function ImageUpload({
  onUploadComplete,
  onError,
  onClear,
  className = '',
  maxSizeMB = 10,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  initialUrl,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      onError?.(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Vercel Blob
    setIsUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      setUploadedUrl(blob.url)
      onUploadComplete?.(blob.url)
    } catch (error) {
      console.error('Upload failed:', error)
      onError?.('Failed to upload image')
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setPreview(null)
    setUploadedUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onClear?.()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && inputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      inputRef.current.files = dt.files
      handleFileSelect({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className={className}>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden bg-moodkin-light-gray">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
          {uploadedUrl && !isUploading && (
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-moodkin-gold text-moodkin-dark text-xs font-medium rounded-full">
              Uploaded
            </div>
          )}
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-moodkin-light-gray rounded-2xl cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-gold/5 transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-10 h-10 text-moodkin-gray/60 mb-3" />
            <p className="mb-2 text-sm text-moodkin-gray">
              <span className="font-medium text-moodkin-dark">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-moodkin-gray/60">
              PNG, JPG, GIF or WebP (max {maxSizeMB}MB)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileSelect}
          />
        </label>
      )}
    </div>
  )
}
