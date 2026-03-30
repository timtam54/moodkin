'use client'

import { useState, useEffect } from 'react'
import { X, Wand2, Loader2, Plus, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface AIImageGeneratorProps {
  open: boolean
  onClose: () => void
  conversationId: string
  onImageSaved: () => void // Called after image is saved to refresh the list
}

interface AIImageCount {
  count: number
  limit: number
  month: string
  quotaExceeded: boolean
}

const STYLE_PRESETS = [
  { value: 'photorealistic', label: 'Photorealistic', icon: '📷' },
  { value: 'editorial fashion', label: 'Editorial', icon: '👗' },
  { value: 'minimalist modern', label: 'Minimalist', icon: '◻️' },
  { value: 'vintage film', label: 'Vintage', icon: '🎞️' },
  { value: 'dreamy ethereal', label: 'Dreamy', icon: '✨' },
  { value: 'bold colorful', label: 'Bold', icon: '🎨' },
  { value: 'moody dramatic', label: 'Moody', icon: '🌑' },
  { value: 'natural organic', label: 'Natural', icon: '🌿' },
]

const SIZE_OPTIONS = [
  { value: '1024x1024', label: 'Square', aspect: '1:1' },
  { value: '1792x1024', label: 'Landscape', aspect: '16:9' },
  { value: '1024x1792', label: 'Portrait', aspect: '9:16' },
]

const PROMPT_EXAMPLES = [
  'Photo taken with a 50mm lens in natural light',
  'Documentary portrait with visible texture and no stylized lighting',
  'Everyday environment, imperfect framing, candid look',
  'Soft morning light through a window, intimate and warm',
  'Editorial fashion shot with clean background and bold contrast',
]

export function AIImageGenerator({
  open,
  onClose,
  conversationId,
  onImageSaved,
}: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{ url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [aiImageCount, setAiImageCount] = useState<AIImageCount | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [showQuotaExceeded, setShowQuotaExceeded] = useState(false)

  // Function to fetch AI image count
  const fetchAIImageCount = async () => {
    setIsLoadingCount(true)
    try {
      const res = await fetch('/api/user/ai-image-count')
      if (res.ok) {
        const data = await res.json()
        setAiImageCount(data)
        if (data.quotaExceeded) {
          setShowQuotaExceeded(true)
        }
      } else {
        console.error('Failed to fetch AI image count:', res.status)
      }
    } catch (err) {
      console.error('Failed to fetch AI image count:', err)
    } finally {
      setIsLoadingCount(false)
    }
  }

  // Fetch AI image count when dialog opens
  useEffect(() => {
    if (open) {
      fetchAIImageCount()
      setShowQuotaExceeded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Must be after all hooks
  if (!open) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      const res = await fetch(`/api/conversations/${conversationId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style, size }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Check for quota exceeded error
        if (data.error === 'QUOTA_EXCEEDED') {
          setShowQuotaExceeded(true)
          setAiImageCount(prev => prev ? { ...prev, count: data.count, quotaExceeded: true } : null)
          return
        }
        throw new Error(data.error || 'Failed to generate image')
      }

      // Update the count from response
      if (data.aiImageCount !== undefined) {
        setAiImageCount(prev => prev ? {
          ...prev,
          count: data.aiImageCount,
          quotaExceeded: data.aiImageCount >= (prev.limit || 100)
        } : null)
      }

      setGeneratedImage({
        url: data.url,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToProject = async () => {
    if (!generatedImage) return

    setIsSaving(true)
    try {
      // Pass the already-generated imageUrl to save the same image the user previewed
      const res = await fetch(`/api/conversations/${conversationId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          size,
          saveToProject: true,
          imageUrl: generatedImage.url,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save image')
      }

      // Notify parent to refresh asset list
      onImageSaved()
      // Refresh the count
      fetchAIImageCount()
      // Reset and close after saving
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setStyle('')
    setSize('1024x1024')
    setGeneratedImage(null)
    setError(null)
    setShowQuotaExceeded(false)
    onClose()
  }

  const handleGenerateAnother = () => {
    setGeneratedImage(null)
    setError(null)
  }

  // Quota exceeded view
  if (showQuotaExceeded && aiImageCount) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md bg-moodkin-cream rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-moodkin-light-gray">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="font-bold text-moodkin-dark text-lg">Monthly Quota Reached</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-moodkin-gray hover:text-moodkin-dark rounded-full hover:bg-moodkin-light-gray/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-moodkin-dark mb-2">
              You&apos;ve created {aiImageCount.limit} images
            </h3>
            <p className="text-moodkin-gray mb-4">
              You&apos;ve consumed your AI image quota for {aiImageCount.month}.
              Your quota will reset at the beginning of next month.
            </p>
            <div className="bg-moodkin-cream/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-moodkin-gray">Images used</span>
                <span className="font-bold text-moodkin-dark">{aiImageCount.count} / {aiImageCount.limit}</span>
              </div>
              <div className="mt-2 h-2 bg-moodkin-light-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-moodkin-light-gray bg-moodkin-cream/50">
            <Button
              onClick={handleClose}
              className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-moodkin-cream rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-moodkin-light-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-moodkin-gold" />
            </div>
            <div>
              <h2 className="font-bold text-moodkin-dark text-lg">AI Image Generator</h2>
              {isLoadingCount ? (
                <p className="text-sm text-moodkin-gray">Loading...</p>
              ) : aiImageCount !== null ? (
                <p className="text-sm text-moodkin-gray">
                  {aiImageCount.count} / {aiImageCount.limit} images this month
                </p>
              ) : (
                <p className="text-sm text-moodkin-gray">Create unique images with AI</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="p-2 text-moodkin-gray hover:text-moodkin-dark rounded-full hover:bg-moodkin-light-gray/50 transition-colors"
              disabled={isGenerating || isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto bg-white">
          {generatedImage ? (
            // Show generated image
            <div className="space-y-4">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-moodkin-cream">
                <Image
                  src={generatedImage.url}
                  alt="Generated image"
                  fill
                  className="object-contain"
                  unoptimized // External URL from Fal.ai
                />
              </div>
            </div>
          ) : (
            // Show input form
            <div className="space-y-5">
              {/* Prompt input */}
              <div>
                <label className="block text-sm font-medium text-moodkin-dark mb-2">
                  Describe your image
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A serene beach at sunset with soft golden light, waves gently rolling onto shore..."
                  className="w-full h-28 px-4 py-3 bg-moodkin-cream/50 border border-moodkin-light-gray rounded-xl text-moodkin-dark placeholder-moodkin-gray/50 focus:outline-none focus:border-moodkin-gold focus:ring-2 focus:ring-moodkin-gold/20 resize-none"
                  disabled={isGenerating}
                />
                {/* Prompt examples */}
                <div className="mt-3">
                  <p className="text-xs text-moodkin-gray mb-2">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_EXAMPLES.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(example)}
                        disabled={isGenerating}
                        className="text-xs px-3 py-1.5 bg-moodkin-cream/70 hover:bg-moodkin-gold/20 border border-moodkin-light-gray hover:border-moodkin-gold rounded-full text-moodkin-gray hover:text-moodkin-dark transition-colors text-left"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Style presets */}
              <div>
                <label className="block text-sm font-medium text-moodkin-dark mb-2">
                  Style (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setStyle(style === preset.value ? '' : preset.value)}
                      disabled={isGenerating}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 border ${
                        style === preset.value
                          ? 'bg-moodkin-gold border-moodkin-gold text-moodkin-dark font-medium'
                          : 'bg-white border-moodkin-light-gray text-moodkin-gray hover:border-moodkin-gold hover:text-moodkin-dark'
                      }`}
                    >
                      <span>{preset.icon}</span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size options */}
              <div>
                <label className="block text-sm font-medium text-moodkin-dark mb-2">
                  Aspect ratio
                </label>
                <div className="flex gap-2">
                  {SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSize(option.value)}
                      disabled={isGenerating}
                      className={`flex-1 px-3 py-3 rounded-xl text-sm transition-all border ${
                        size === option.value
                          ? 'bg-moodkin-gold border-moodkin-gold text-moodkin-dark font-medium'
                          : 'bg-white border-moodkin-light-gray text-moodkin-gray hover:border-moodkin-gold'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-70">{option.aspect}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-moodkin-light-gray bg-moodkin-cream/50">
          {generatedImage ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGenerateAnother}
                disabled={isSaving}
                className="flex-1 border-moodkin-light-gray text-moodkin-dark hover:bg-moodkin-cream"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Another
              </Button>
              <Button
                onClick={handleSaveToProject}
                disabled={isSaving}
                className="flex-1 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Project
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold py-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
