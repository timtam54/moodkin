'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import type { ProjectAsset } from '@/types/database'

export interface MoodboardOptions {
  backgroundColor: string
  gridLayout: string
  borderEnabled: boolean
  borderColor: string
  borderRadius: number
  borderWidth: number
  spacing: number
}

export interface RankedAsset {
  asset: ProjectAsset
  score: number
}

interface MoodboardCreatorDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (options: MoodboardOptions) => Promise<void>
  rankedAssets: RankedAsset[] // Assets sorted by score (highest first), flagged excluded
  isLoading?: boolean
}

const BACKGROUND_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#1A1A1A', label: 'Black' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
  { value: '#2C3E50', label: 'Navy' },
  { value: '#F8E9D6', label: 'Peach' },
  { value: '#E8F4E8', label: 'Mint' },
]

export function MoodboardCreatorDialog({
  open,
  onClose,
  onCreate,
  rankedAssets,
  isLoading,
}: MoodboardCreatorDialogProps) {
  const [backgroundColor, setBackgroundColor] = useState('#1A1A1A')
  const [borderRadius, setBorderRadius] = useState(12)
  const [spacing, setSpacing] = useState(8)

  if (!open) return null

  const handleCreate = async () => {
    await onCreate({
      backgroundColor,
      gridLayout: 'auto', // Always auto for automatic mode
      borderEnabled: true,
      borderColor: '#FFFFFF',
      borderRadius,
      borderWidth: 0,
      spacing,
    })
  }

  // Calculate layout: top liked images are larger, bottom ones smaller
  // Layout: top row has 1-2 large images, middle has medium, bottom has small grid
  const renderMoodboardPreview = () => {
    if (rankedAssets.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/50">
          No images available
        </div>
      )
    }

    const imageStyle = (radius: number) => ({
      borderRadius: `${radius}px`,
      overflow: 'hidden' as const,
    })

    // Different layouts based on image count
    const count = rankedAssets.length

    if (count === 1) {
      // Single large image
      return (
        <div className="w-full h-full p-2" style={{ padding: `${spacing}px` }}>
          <div className="relative w-full h-full" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[0].asset.thumbnail_url || rankedAssets[0].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
        </div>
      )
    }

    if (count === 2) {
      // Two images side by side, first one slightly larger
      return (
        <div className="w-full h-full grid grid-cols-5 gap-2" style={{ padding: `${spacing}px`, gap: `${spacing}px` }}>
          <div className="relative col-span-3 h-full" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[0].asset.thumbnail_url || rankedAssets[0].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
          <div className="relative col-span-2 h-full" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[1].asset.thumbnail_url || rankedAssets[1].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
        </div>
      )
    }

    if (count === 3) {
      // One large on top, two smaller below
      return (
        <div className="w-full h-full grid grid-rows-5 gap-2" style={{ padding: `${spacing}px`, gap: `${spacing}px` }}>
          <div className="relative row-span-3 w-full" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[0].asset.thumbnail_url || rankedAssets[0].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
          <div className="row-span-2 grid grid-cols-2 gap-2" style={{ gap: `${spacing}px` }}>
            <div className="relative w-full h-full" style={imageStyle(borderRadius)}>
              <Image
                src={rankedAssets[1].asset.thumbnail_url || rankedAssets[1].asset.url}
                alt=""
                fill
                className="object-cover"
                style={{ borderRadius: `${borderRadius}px` }}
              />
            </div>
            <div className="relative w-full h-full" style={imageStyle(borderRadius)}>
              <Image
                src={rankedAssets[2].asset.thumbnail_url || rankedAssets[2].asset.url}
                alt=""
                fill
                className="object-cover"
                style={{ borderRadius: `${borderRadius}px` }}
              />
            </div>
          </div>
        </div>
      )
    }

    if (count === 4) {
      // One large top-left, one medium top-right, two small bottom
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-5 gap-2" style={{ padding: `${spacing}px`, gap: `${spacing}px` }}>
          <div className="relative row-span-3" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[0].asset.thumbnail_url || rankedAssets[0].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
          <div className="relative row-span-2" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[1].asset.thumbnail_url || rankedAssets[1].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
          <div className="relative row-span-2" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[2].asset.thumbnail_url || rankedAssets[2].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
          <div className="relative row-span-3" style={imageStyle(borderRadius)}>
            <Image
              src={rankedAssets[3].asset.thumbnail_url || rankedAssets[3].asset.url}
              alt=""
              fill
              className="object-cover"
              style={{ borderRadius: `${borderRadius}px` }}
            />
          </div>
        </div>
      )
    }

    // 5+ images: Featured layout with most liked larger
    // Top section: 1-2 large images (most liked)
    // Middle section: 2-3 medium images
    // Bottom section: remaining smaller images in rows

    const topImages = rankedAssets.slice(0, 2)
    const midImages = rankedAssets.slice(2, 5)
    const bottomImages = rankedAssets.slice(5) // All remaining images

    return (
      <div className="w-full h-full flex flex-col" style={{ padding: `${spacing}px`, gap: `${spacing}px` }}>
        {/* Top row - largest images (most liked) */}
        <div className="flex-[3] grid grid-cols-2 gap-2" style={{ gap: `${spacing}px` }}>
          {topImages.map((item, i) => (
            <div
              key={item.asset.id}
              className={`relative ${topImages.length === 1 ? 'col-span-2' : ''}`}
              style={imageStyle(borderRadius)}
            >
              <Image
                src={item.asset.thumbnail_url || item.asset.url}
                alt=""
                fill
                className="object-cover"
                style={{ borderRadius: `${borderRadius}px` }}
              />
            </div>
          ))}
        </div>

        {/* Middle row - medium images */}
        {midImages.length > 0 && (
          <div className="flex-[2] grid gap-2" style={{ gridTemplateColumns: `repeat(${midImages.length}, 1fr)`, gap: `${spacing}px` }}>
            {midImages.map((item) => (
              <div key={item.asset.id} className="relative" style={imageStyle(borderRadius)}>
                <Image
                  src={item.asset.thumbnail_url || item.asset.url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ borderRadius: `${borderRadius}px` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom rows - smaller images (least liked) */}
        {bottomImages.length > 0 && (
          <div className="flex-1 grid gap-2" style={{
            gridTemplateColumns: `repeat(${Math.min(bottomImages.length, 4)}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(bottomImages.length / 4)}, 1fr)`,
            gap: `${spacing}px`
          }}>
            {bottomImages.map((item) => (
              <div key={item.asset.id} className="relative" style={imageStyle(borderRadius)}>
                <Image
                  src={item.asset.thumbnail_url || item.asset.url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ borderRadius: `${borderRadius}px` }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Dark background */}
      <div className="absolute inset-0 bg-[#1a1a1a]" />

      {/* Preview Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 pt-16">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
          disabled={isLoading}>
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <div className="text-white/70 text-sm">Automatic Moodboard</div>
          <div className="text-white/50 text-xs">{rankedAssets.length} photos available</div>
        </div>

        {/* Moodboard Preview */}
        <div
          className="w-full max-w-md aspect-square rounded-2xl overflow-hidden"
          style={{ backgroundColor }}
        >
          {renderMoodboardPreview()}
        </div>
      </div>

      {/* Bottom Panel - Only Border options */}
      <div className="relative bg-[#2a2a2a] rounded-t-3xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-8 py-4 border-b border-white/10">
          <span className="text-sm font-medium text-white">
            Border & Style
          </span>
          <button
            onClick={handleCreate}
            disabled={isLoading || rankedAssets.length === 0}
            className="ml-4 text-white/80 hover:text-white disabled:text-white/30"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          </button>
        </div>

        {/* Border Controls */}
        <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto space-y-6">
          {/* Spacing Slider */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-white/60">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="7" width="6" height="2" />
                  <rect x="9" y="7" width="6" height="2" />
                </svg>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>

          {/* Border Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-white/60">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="12" height="12" rx="3" />
                </svg>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-white/60">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" />
                </svg>
              </div>
              <div className="flex-1 flex gap-2 flex-wrap items-center">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setBackgroundColor(color.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      backgroundColor === color.value
                        ? 'border-white scale-110'
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {backgroundColor === color.value && (
                      <Check className={`w-4 h-4 mx-auto ${
                        color.value === '#1A1A1A' || color.value === '#2C3E50' ? 'text-white' : 'text-moodkin-dark'
                      }`} />
                    )}
                  </button>
                ))}
                {/* Custom color picker */}
                <label
                  className={`relative w-8 h-8 rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
                    !BACKGROUND_COLORS.some(c => c.value === backgroundColor)
                      ? 'border-white scale-110'
                      : 'border-transparent hover:border-white/30'
                  }`}
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                  <div
                    className="w-full h-full"
                    style={{
                      background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                  />
                  {!BACKGROUND_COLORS.some(c => c.value === backgroundColor) && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor }}
                    >
                      <Check className="w-4 h-4 text-white mix-blend-difference" />
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="px-4 pb-6">
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || rankedAssets.length === 0}
            className="w-full py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create Moodboard (${rankedAssets.length} images)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
