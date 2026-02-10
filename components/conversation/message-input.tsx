'use client'

import { useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Send, ImageIcon, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('File size must be less than 10MB')
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Vercel Blob
    setIsUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setImageUrl(blob.url)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image')
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  function clearImage() {
    setImagePreview(null)
    setImageUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageUrl) return
    if (isUploading) return

    onSend(trimmed, imageUrl || undefined)
    setText('')
    clearImage()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = (text.trim() || imageUrl) && !isUploading

  return (
    <form onSubmit={handleSubmit} className="border-t">
      {imagePreview && (
        <div className="p-2 border-b bg-gray-50">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            {!isUploading && (
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 p-1 bg-gray-800 hover:bg-gray-900 rounded-full"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0"
        >
          <ImageIcon className="w-5 h-5 text-gray-500" />
        </Button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
          disabled={disabled}
        />
        <Button type="submit" variant="primary" size="icon" disabled={disabled || !canSend}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}
