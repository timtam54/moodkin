'use client'

import { useState, useMemo } from 'react'
import { X, Check, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import type { ProjectAsset } from '@/types/database'

export interface InshotMoodboardOptions {
  backgroundColor: string
  gridLayout: string
  borderEnabled: boolean
  borderColor: string
  borderRadius: number
  borderWidth: number
  spacing: number
  aspectRatio: string
  frameWidth: number
}

interface InshotMoodboardCreatorProps {
  open: boolean
  onClose: () => void
  onCreate: (options: InshotMoodboardOptions, selectedAssetIds: string[]) => Promise<void>
  assets: ProjectAsset[]
  isLoading?: boolean
}

const INSHOT_LAYOUTS = [
  { id: '2x2', label: '2×2 Grid', cols: 2, rows: 2 },
  { id: '1+2', label: '1 Top + 2 Bottom', cols: 2, rows: 2 },
  { id: '2+1', label: '2 Top + 1 Bottom', cols: 2, rows: 2 },
  { id: '1+3', label: '1 Large + 3 Small', cols: 2, rows: 2 },
]

const FRAME_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#1A1A1A', label: 'Black' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
  { value: '#FFC0CB', label: 'Pink' },
]

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1, height: 1 },
  { id: '4:5', label: '4:5', width: 4, height: 5 },
  { id: '9:16', label: '9:16', width: 9, height: 16 },
  { id: '16:9', label: '16:9', width: 16, height: 9 },
  { id: '4:3', label: '4:3', width: 4, height: 3 },
  { id: '3:4', label: '3:4', width: 3, height: 4 },
]

export function InshotMoodboardCreator({
  open,
  onClose,
  onCreate,
  assets,
  isLoading,
}: InshotMoodboardCreatorProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [layout, setLayout] = useState('2x2')
  const [frameColor, setFrameColor] = useState('#FFFFFF')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [frameWidth, setFrameWidth] = useState(24)
  const [step, setStep] = useState<'select' | 'aspectRatio' | 'customize'>('select')

  // Filter to only image assets
  const imageAssets = useMemo(() =>
    assets.filter(a => a.asset_type === 'image' && a.url),
    [assets]
  )

  const selectedAssetObjects = useMemo(() =>
    selectedAssets
      .map(id => imageAssets.find(a => a.id === id))
      .filter((a): a is ProjectAsset => !!a),
    [selectedAssets, imageAssets]
  )

  if (!open) return null

  const handleToggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId)
      }
      if (prev.length >= 4) {
        // Replace the oldest selection
        return [...prev.slice(1), assetId]
      }
      return [...prev, assetId]
    })
  }

  const handleCreate = async () => {
    await onCreate({
      backgroundColor: frameColor,
      gridLayout: layout,
      borderEnabled: true,
      borderColor: frameColor,
      borderRadius: 0,
      borderWidth: frameWidth,
      spacing: 2,
      aspectRatio,
      frameWidth,
    }, selectedAssets)
  }

  const handleContinueToAspectRatio = () => {
    if (selectedAssets.length >= 2) {
      setStep('aspectRatio')
    }
  }

  const handleContinueToCustomize = () => {
    setStep('customize')
  }

  const handleBack = () => {
    if (step === 'customize') {
      setStep('aspectRatio')
    } else if (step === 'aspectRatio') {
      setStep('select')
    }
  }

  // Get current aspect ratio dimensions
  const currentAspectRatio = ASPECT_RATIOS.find(ar => ar.id === aspectRatio) || ASPECT_RATIOS[0]

  const renderInshotPreview = () => {
    if (selectedAssetObjects.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
          Select 2-4 images
        </div>
      )
    }

    const images = selectedAssetObjects
    const count = images.length

    // Render based on layout and image count
    const renderLayout = () => {
      if (layout === '2x2' || count === 4) {
        // Classic 2x2 grid
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
            {images.slice(0, 4).map((asset, i) => (
              <div key={asset.id} className="relative overflow-hidden">
                <Image
                  src={asset.thumbnail_url || asset.url}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {/* Fill empty slots with placeholder */}
            {Array.from({ length: Math.max(0, 4 - count) }).map((_, i) => (
              <div key={`empty-${i}`} className="relative bg-white/10" />
            ))}
          </div>
        )
      }

      if (layout === '1+2' && count >= 2) {
        // 1 large on top, 2 small on bottom
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="relative overflow-hidden">
              <Image
                src={images[0].thumbnail_url || images[0].url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-[2px]">
              {images.slice(1, 3).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden">
                  <Image
                    src={asset.thumbnail_url || asset.url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {count < 3 && <div className="relative bg-white/10" />}
            </div>
          </div>
        )
      }

      if (layout === '2+1' && count >= 2) {
        // 2 small on top, 1 large on bottom
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="grid grid-cols-2 gap-[2px]">
              {images.slice(0, 2).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden">
                  <Image
                    src={asset.thumbnail_url || asset.url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden">
              <Image
                src={images[count >= 3 ? 2 : 0].thumbnail_url || images[count >= 3 ? 2 : 0].url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          </div>
        )
      }

      if (layout === '1+3' && count >= 2) {
        // 1 large left, 3 small right (or 2 if only 3 images)
        return (
          <div className="w-full h-full grid grid-cols-2 gap-[2px]">
            <div className="relative overflow-hidden">
              <Image
                src={images[0].thumbnail_url || images[0].url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="grid grid-rows-3 gap-[2px]">
              {images.slice(1, 4).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden">
                  <Image
                    src={asset.thumbnail_url || asset.url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {Array.from({ length: Math.max(0, 3 - (count - 1)) }).map((_, i) => (
                <div key={`empty-${i}`} className="relative bg-white/10" />
              ))}
            </div>
          </div>
        )
      }

      // Fallback: simple grid
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
          {images.slice(0, 4).map((asset) => (
            <div key={asset.id} className="relative overflow-hidden">
              <Image
                src={asset.thumbnail_url || asset.url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{ padding: `${frameWidth}px`, backgroundColor: frameColor }}
      >
        {renderLayout()}
      </div>
    )
  }

  // Step 1: Image Selection
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">Create InShot</div>
            <div className="text-white/50 text-xs">Select 2-4 photos</div>
          </div>
          <button
            onClick={handleContinueToAspectRatio}
            disabled={selectedAssets.length < 2}
            className="px-4 py-2 text-sm font-medium text-moodkin-dark bg-moodkin-gold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Selection indicator */}
        <div className="flex items-center justify-center gap-2 py-3 bg-white/5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                selectedAssets.length >= n
                  ? 'bg-moodkin-gold text-moodkin-dark'
                  : 'bg-white/10 text-white/30'
              }`}
            >
              {n}
            </div>
          ))}
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {imageAssets.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <p>No images available</p>
              <p className="text-sm mt-1">Upload some images first</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {imageAssets.map((asset, index) => {
                const isSelected = selectedAssets.includes(asset.id)
                const selectionIndex = selectedAssets.indexOf(asset.id)
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleToggleAsset(asset.id)}
                    className={`relative aspect-square rounded-md overflow-hidden transition-all ${
                      isSelected ? 'ring-2 ring-moodkin-gold ring-offset-1 ring-offset-[#1a1a1a]' : ''
                    }`}
                  >
                    <Image
                      src={asset.thumbnail_url || asset.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-moodkin-gold rounded-full flex items-center justify-center text-[10px] font-bold text-moodkin-dark">
                        {selectionIndex + 1}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 2: Aspect Ratio Selection
  if (step === 'aspectRatio') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={handleBack}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">Select Ratio</div>
            <div className="text-white/50 text-xs">Choose aspect ratio</div>
          </div>
          <button
            onClick={handleContinueToCustomize}
            className="px-4 py-2 text-sm font-medium text-moodkin-dark bg-moodkin-gold rounded-xl"
          >
            Next
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="rounded-xl overflow-hidden shadow-2xl bg-white relative"
            style={{
              aspectRatio: `${currentAspectRatio.width} / ${currentAspectRatio.height}`,
              width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(80%, 300px)' : 'auto',
              height: currentAspectRatio.height > currentAspectRatio.width ? 'min(100%, 400px)' : 'auto',
            }}
          >
            {renderInshotPreview()}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="bg-[#2a2a2a] rounded-t-3xl">
          <div className="p-4 pb-8">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-3">Aspect Ratio</div>
            <div className="grid grid-cols-3 gap-3">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setAspectRatio(ar.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    aspectRatio === ar.id
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {/* Visual representation of aspect ratio */}
                  <div
                    className={`border-2 mb-2 ${
                      aspectRatio === ar.id ? 'border-moodkin-dark' : 'border-white/50'
                    }`}
                    style={{
                      width: `${Math.min(40, 40 * (ar.width / Math.max(ar.width, ar.height)))}px`,
                      height: `${Math.min(40, 40 * (ar.height / Math.max(ar.width, ar.height)))}px`,
                    }}
                  />
                  <span className="text-sm font-medium">{ar.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Customize
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={handleBack}
          className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Customize Style</div>
          <div className="text-white/50 text-xs">{selectedAssets.length} photos selected</div>
        </div>
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="p-2 text-white/70 hover:text-white disabled:text-white/30"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="rounded-xl overflow-hidden shadow-2xl relative"
          style={{
            aspectRatio: `${currentAspectRatio.width} / ${currentAspectRatio.height}`,
            width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(80%, 300px)' : 'auto',
            height: currentAspectRatio.height > currentAspectRatio.width ? 'min(100%, 400px)' : 'auto',
          }}
        >
          {renderInshotPreview()}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-[#2a2a2a] rounded-t-3xl">
        <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto space-y-6">
          {/* Layout Selector */}
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Layout</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {INSHOT_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    layout === l.id
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Width Slider */}
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Frame: {frameWidth}px</div>
            <input
              type="range"
              min="8"
              max="48"
              value={frameWidth}
              onChange={(e) => setFrameWidth(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Frame Color */}
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Frame Color</div>
            <div className="flex gap-2 flex-wrap">
              {FRAME_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFrameColor(color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    frameColor === color.value
                      ? 'border-moodkin-gold scale-110'
                      : 'border-transparent hover:border-white/30'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {frameColor === color.value && (
                    <Check className={`w-4 h-4 mx-auto ${
                      color.value === '#1A1A1A' ? 'text-white' : 'text-moodkin-dark'
                    }`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="px-4 pb-6">
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || selectedAssets.length < 2}
            className="w-full py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create InShot (${selectedAssets.length} images)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
