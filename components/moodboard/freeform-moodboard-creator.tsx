'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Check, Loader2, ChevronLeft, ChevronRight, RotateCw, ArrowUp, ArrowDown, Trash2, Move, HelpCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import type { ProjectAsset } from '@/types/database'
import { FreeformHelpDialog } from './freeform-help-dialog'

export interface FreeformImageData {
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
}

export interface FreeformMoodboardOptions {
  images: FreeformImageData[]
  backgroundColor: string
  aspectRatio: 'portrait' | 'square' | 'landscape'
}

interface FreeformMoodboardCreatorProps {
  open: boolean
  onClose: () => void
  onCreate: (options: FreeformMoodboardOptions) => Promise<void>
  assets: ProjectAsset[]
  flaggedAssetIds?: Set<string>
  isLoading?: boolean
}

type StepType = 'aspect' | 'canvas'
type AspectRatioType = 'portrait' | 'square' | 'landscape'

const ASPECT_RATIOS: { value: AspectRatioType; label: string; icon: React.ReactNode; dimensions: string }[] = [
  {
    value: 'portrait',
    label: 'Portrait',
    dimensions: '3:4',
    icon: (
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="30" height="38" rx="4" />
      </svg>
    ),
  },
  {
    value: 'square',
    label: 'Square',
    dimensions: '1:1',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="34" height="34" rx="4" />
      </svg>
    ),
  },
  {
    value: 'landscape',
    label: 'Landscape',
    dimensions: '4:3',
    icon: (
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="38" height="30" rx="4" />
      </svg>
    ),
  },
]

const STEPS: { id: StepType; label: string; description: string; mobileDescription?: string }[] = [
  { id: 'aspect', label: 'Size', description: 'Choose the canvas size for your moodboard' },
  {
    id: 'canvas',
    label: 'Canvas',
    description: 'Drag photos onto the canvas and arrange them freely, drag corners to resize',
    mobileDescription: 'Arrange your moodboard',
  },
]

const DEFAULT_BACKGROUND_COLORS = [
  // Neutrals
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#FAF7F2', label: 'Ivory' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
  { value: '#9CA3AF', label: 'Slate Gray' },
  { value: '#4B5563', label: 'Charcoal' },
  { value: '#1A1A1A', label: 'Black' },
  // Warm tones
  { value: '#FCE7D6', label: 'Peach' },
  { value: '#F4C2A1', label: 'Apricot' },
  { value: '#E9B824', label: 'Gold' },
  { value: '#D97706', label: 'Amber' },
  { value: '#B45309', label: 'Terracotta' },
  { value: '#7C2D12', label: 'Rust' },
  // Pinks / reds
  { value: '#FBCFE8', label: 'Blush' },
  { value: '#F472B6', label: 'Pink' },
  { value: '#DC2626', label: 'Red' },
  { value: '#881337', label: 'Wine' },
  // Greens
  { value: '#D1FAE5', label: 'Mint' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#065F46', label: 'Forest' },
  { value: '#3F6212', label: 'Olive' },
  // Blues / purples
  { value: '#DBEAFE', label: 'Sky' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#1E3A8A', label: 'Navy' },
  { value: '#7C3AED', label: 'Violet' },
  { value: '#4C1D95', label: 'Plum' },
]

// Helper to get image URL (use thumbnail for links)
function getImageUrl(asset: ProjectAsset): string {
  return asset.asset_type === 'link' ? (asset.thumbnail_url || '') : asset.url
}

interface CanvasImage extends FreeformImageData {
  asset: ProjectAsset
}

export function FreeformMoodboardCreator({
  open,
  onClose,
  onCreate,
  assets,
  flaggedAssetIds = new Set(),
  isLoading,
}: FreeformMoodboardCreatorProps) {
  const [currentStep, setCurrentStep] = useState<StepType>('aspect')
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('square')
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageStartPos, setImageStartPos] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [resizeCorner, setResizeCorner] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [nextZIndex, setNextZIndex] = useState(1)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pickerColor, setPickerColor] = useState('#E9B824')
  const [showCanvasHint, setShowCanvasHint] = useState(false)

  // Filter to visual assets (images and links with thumbnails)
  const visualAssets = useMemo(() =>
    assets.filter(a =>
      (a.asset_type === 'image' || (a.asset_type === 'link' && a.thumbnail_url)) &&
      !flaggedAssetIds.has(a.id)
    ),
    [assets, flaggedAssetIds]
  )

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setCurrentStep('aspect')
      setAspectRatio('square')
      setCanvasImages([])
      setSelectedImageId(null)
      setBackgroundColor('#FFFFFF')
      setNextZIndex(1)
      setCustomColors([])
      setColorPickerOpen(false)
      setPickerColor('#E9B824')
      setShowCanvasHint(false)
    }
  }, [open])

  // Show canvas hint when entering the canvas step, auto-hide after 10s
  useEffect(() => {
    if (currentStep !== 'canvas') {
      setShowCanvasHint(false)
      return
    }
    setShowCanvasHint(true)
    const timer = setTimeout(() => setShowCanvasHint(false), 10000)
    return () => clearTimeout(timer)
  }, [currentStep])

  // Get canvas dimensions based on aspect ratio (responsive)
  const getCanvasDimensions = () => {
    // Use smaller size on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const baseSize = isMobile ? 300 : 500
    switch (aspectRatio) {
      case 'portrait':
        return { width: baseSize * 0.75, height: baseSize }
      case 'landscape':
        return { width: baseSize, height: baseSize * 0.75 }
      default:
        return { width: baseSize, height: baseSize }
    }
  }

  const canvasDimensions = getCanvasDimensions()

  // Add image to canvas (used for both drag-drop and tap-to-add on mobile)
  const addImageToCanvas = (assetId: string, x?: number, y?: number) => {
    const asset = visualAssets.find(a => a.id === assetId)
    if (!asset) return

    // Check if already on canvas
    if (canvasImages.some(img => img.assetId === assetId)) return

    const newImage: CanvasImage = {
      assetId,
      asset,
      x: x ?? 30, // Default to center-ish
      y: y ?? 30,
      width: 35,
      height: 35,
      rotation: 0,
      zIndex: nextZIndex,
    }

    setCanvasImages(prev => [...prev, newImage])
    setNextZIndex(prev => prev + 1)
    setSelectedImageId(assetId)
  }

  // Handle tapping an image in gallery (mobile)
  const handleGalleryImageTap = (assetId: string) => {
    addImageToCanvas(assetId)
  }

  // Handle dropping an image onto the canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    if (!assetId) return

    const asset = visualAssets.find(a => a.id === assetId)
    if (!asset) return

    // Check if already on canvas
    if (canvasImages.some(img => img.assetId === assetId)) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100 - 10 // Center the image
    const y = ((e.clientY - rect.top) / rect.height) * 100 - 10

    const newImage: CanvasImage = {
      assetId,
      asset,
      x: Math.max(0, Math.min(60, x)),
      y: Math.max(0, Math.min(60, y)),
      width: 35,
      height: 35,
      rotation: 0,
      zIndex: nextZIndex,
    }

    setCanvasImages(prev => [...prev, newImage])
    setNextZIndex(prev => prev + 1)
    setSelectedImageId(assetId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle image selection
  const handleImageClick = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    setSelectedImageId(assetId)
  }

  // Handle canvas click (deselect)
  const handleCanvasClick = () => {
    setSelectedImageId(null)
  }

  // Start dragging an image on canvas (mouse)
  const handleImageMouseDown = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    e.preventDefault()

    const img = canvasImages.find(i => i.assetId === assetId)
    if (!img) return

    setSelectedImageId(assetId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setImageStartPos({ x: img.x, y: img.y, width: img.width, height: img.height })
  }

  // Start dragging an image on canvas (touch)
  const handleImageTouchStart = (e: React.TouchEvent, assetId: string) => {
    e.stopPropagation()

    const touch = e.touches[0]
    const img = canvasImages.find(i => i.assetId === assetId)
    if (!img) return

    setSelectedImageId(assetId)
    setIsDragging(true)
    setDragStart({ x: touch.clientX, y: touch.clientY })
    setImageStartPos({ x: img.x, y: img.y, width: img.width, height: img.height })
  }

  // Start resizing (mouse)
  const handleResizeMouseDown = (e: React.MouseEvent, assetId: string, corner: string) => {
    e.stopPropagation()
    e.preventDefault()

    const img = canvasImages.find(i => i.assetId === assetId)
    if (!img) return

    setSelectedImageId(assetId)
    setIsResizing(true)
    setResizeCorner(corner)
    setDragStart({ x: e.clientX, y: e.clientY })
    setImageStartPos({ x: img.x, y: img.y, width: img.width, height: img.height })
  }

  // Start resizing (touch)
  const handleResizeTouchStart = (e: React.TouchEvent, assetId: string, corner: string) => {
    e.stopPropagation()

    const touch = e.touches[0]
    const img = canvasImages.find(i => i.assetId === assetId)
    if (!img) return

    setSelectedImageId(assetId)
    setIsResizing(true)
    setResizeCorner(corner)
    setDragStart({ x: touch.clientX, y: touch.clientY })
    setImageStartPos({ x: img.x, y: img.y, width: img.width, height: img.height })
  }

  // Handle mouse/touch move for dragging/resizing
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!selectedImageId || (!isDragging && !isResizing)) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const deltaX = ((clientX - dragStart.x) / rect.width) * 100
      const deltaY = ((clientY - dragStart.y) / rect.height) * 100

      setCanvasImages(prev => prev.map(img => {
        if (img.assetId !== selectedImageId) return img

        if (isDragging) {
          return {
            ...img,
            x: Math.max(0, Math.min(100 - img.width, imageStartPos.x + deltaX)),
            y: Math.max(0, Math.min(100 - img.height, imageStartPos.y + deltaY)),
          }
        }

        if (isResizing) {
          let newWidth = imageStartPos.width
          let newHeight = imageStartPos.height
          let newX = imageStartPos.x
          let newY = imageStartPos.y

          if (resizeCorner?.includes('e')) {
            newWidth = Math.max(5, imageStartPos.width + deltaX)
          }
          if (resizeCorner?.includes('w')) {
            newWidth = Math.max(5, imageStartPos.width - deltaX)
            newX = imageStartPos.x + deltaX
          }
          if (resizeCorner?.includes('s')) {
            newHeight = Math.max(5, imageStartPos.height + deltaY)
          }
          if (resizeCorner?.includes('n')) {
            newHeight = Math.max(5, imageStartPos.height - deltaY)
            newY = imageStartPos.y + deltaY
          }

          return {
            ...img,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: Math.min(100, newWidth),
            height: Math.min(100, newHeight),
          }
        }

        return img
      }))
    }

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault() // Prevent scrolling while dragging
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeCorner(null)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, isResizing, selectedImageId, dragStart, imageStartPos, resizeCorner])

  // Rotation control
  const handleRotate = (delta: number) => {
    if (!selectedImageId) return
    setCanvasImages(prev => prev.map(img =>
      img.assetId === selectedImageId
        ? { ...img, rotation: (img.rotation + delta) % 360 }
        : img
    ))
  }

  // Layer controls
  const bringToFront = () => {
    if (!selectedImageId) return
    setCanvasImages(prev => prev.map(img =>
      img.assetId === selectedImageId
        ? { ...img, zIndex: nextZIndex }
        : img
    ))
    setNextZIndex(prev => prev + 1)
  }

  const sendToBack = () => {
    if (!selectedImageId) return
    const minZ = Math.min(...canvasImages.map(i => i.zIndex))
    setCanvasImages(prev => prev.map(img =>
      img.assetId === selectedImageId
        ? { ...img, zIndex: minZ - 1 }
        : img
    ))
  }

  // Delete selected image
  const deleteSelected = () => {
    if (!selectedImageId) return
    setCanvasImages(prev => prev.filter(img => img.assetId !== selectedImageId))
    setSelectedImageId(null)
  }

  // Navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  const canGoNext = currentStep === 'aspect' || (currentStep === 'canvas' && canvasImages.length > 0)
  const isLastStep = currentStepIndex === STEPS.length - 1

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id)
    }
  }

  const handleCreate = async () => {
    const options: FreeformMoodboardOptions = {
      images: canvasImages.map(img => ({
        assetId: img.assetId,
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height,
        rotation: img.rotation,
        zIndex: img.zIndex,
      })),
      backgroundColor,
      aspectRatio,
    }
    await onCreate(options)
  }

  const selectedImage = canvasImages.find(img => img.assetId === selectedImageId)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-2xl shadow-xl w-full max-w-none md:max-w-6xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-moodkin-gold/40 bg-moodkin-gold">
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-moodkin-dark truncate leading-tight">
              <span className="hidden md:inline">Moodboard</span>
              <span className="md:hidden">
                {STEPS[currentStepIndex].mobileDescription ?? STEPS[currentStepIndex].description}
              </span>
            </h2>
            <p className="hidden md:block text-xs md:text-sm text-moodkin-dark/70">
              {STEPS[currentStepIndex].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-moodkin-dark/10 transition-colors"
          >
            <X className="w-5 h-5 text-moodkin-dark" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-3 md:px-4 py-1 md:py-3 border-b border-moodkin-light-gray/30">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => index < currentStepIndex && setCurrentStep(step.id)}
                disabled={index > currentStepIndex}
                className={`flex items-center gap-2 px-3 py-1 md:py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step.id === currentStep
                    ? 'bg-moodkin-gold text-moodkin-dark'
                    : index < currentStepIndex
                    ? 'bg-moodkin-cream text-moodkin-dark cursor-pointer hover:bg-moodkin-gold/50'
                    : 'bg-moodkin-light-gray/30 text-moodkin-gray'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                  {index < currentStepIndex ? <Check className="w-3 h-3" /> : index + 1}
                </span>
                {step.label}
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-moodkin-light-gray" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 ${currentStep === 'canvas' ? 'overflow-hidden px-2 pt-0.5 pb-2 md:p-6' : 'overflow-y-auto p-4 md:p-6'}`}>
          {/* Step 1: Aspect Ratio Selection */}
          {currentStep === 'aspect' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`flex flex-row sm:flex-col items-center gap-3 sm:gap-3 p-4 sm:p-6 rounded-xl border-2 transition-all ${
                      aspectRatio === ratio.value
                        ? 'border-moodkin-gold bg-moodkin-gold/10'
                        : 'border-moodkin-light-gray hover:border-moodkin-gold/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${aspectRatio === ratio.value ? 'text-moodkin-gold' : 'text-moodkin-gray'}`}>
                      {ratio.icon}
                    </div>
                    <div className="text-left sm:text-center">
                      <p className="font-medium text-moodkin-dark">{ratio.label}</p>
                      <p className="text-sm text-moodkin-gray">{ratio.dimensions}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Background Color */}
              <div className="max-w-lg mx-auto">
                <h3 className="text-sm font-medium text-moodkin-dark mb-3">Background Color</h3>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_BACKGROUND_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setBackgroundColor(color.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        backgroundColor === color.value
                          ? 'border-moodkin-gold scale-110'
                          : 'border-moodkin-light-gray hover:border-moodkin-gold/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                  {customColors.map(color => (
                    <button
                      key={`custom-${color}`}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        backgroundColor === color
                          ? 'border-moodkin-gold scale-110'
                          : 'border-moodkin-light-gray hover:border-moodkin-gold/50'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Custom ${color}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPickerColor(backgroundColor)
                      setColorPickerOpen(true)
                    }}
                    className="w-10 h-10 rounded-lg border-2 border-dashed border-moodkin-light-gray hover:border-moodkin-gold flex items-center justify-center text-moodkin-gray hover:text-moodkin-dark transition-all"
                    title="Custom color"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Canvas Editor */}
          {currentStep === 'canvas' && (
            <div className="flex flex-col md:flex-row gap-1 md:gap-6 h-full md:h-[500px]">
              {/* Mobile hint banner */}
              {showCanvasHint && (
                <div className="md:hidden flex items-start justify-between gap-2 bg-moodkin-gold/15 border border-moodkin-gold/40 text-moodkin-dark text-xs rounded-lg px-3 py-2">
                  <span>Tap photos below to add them to the canvas. Then drag to position, drag corners to resize.</span>
                  <button
                    onClick={() => setShowCanvasHint(false)}
                    className="flex-shrink-0 p-0.5 rounded-full hover:bg-moodkin-gold/30 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Image Gallery - Top scrollable on mobile, Left sidebar on desktop */}
              <div className="w-full md:w-48 flex-1 md:flex-none min-h-0 md:flex-shrink-0 md:border-r border-b md:border-b-0 border-moodkin-light-gray/30 pb-1 md:pb-0 md:pr-4 overflow-y-auto">
                <div className="flex items-center justify-between sticky top-0 bg-white py-0 mb-1 md:mb-3 z-10">
                  <h3 className="text-sm font-medium text-moodkin-dark">
                    <span className="hidden md:inline">Drag images to canvas</span>
                    <span className="md:hidden">Tap photos to add to canvas</span>
                  </h3>
                  <button
                    onClick={() => setHelpDialogOpen(true)}
                    className="p-1.5 rounded-full hover:bg-moodkin-cream transition-colors"
                    title="Help"
                  >
                    <HelpCircle className="w-4 h-4 text-moodkin-gray" />
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
                  {visualAssets.map(asset => {
                    const isOnCanvas = canvasImages.some(img => img.assetId === asset.id)
                    return (
                      <div
                        key={asset.id}
                        draggable={!isOnCanvas}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('assetId', asset.id)
                        }}
                        onClick={() => !isOnCanvas && handleGalleryImageTap(asset.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer md:cursor-grab active:cursor-grabbing ${
                          isOnCanvas ? 'opacity-40' : 'hover:ring-2 hover:ring-moodkin-gold active:ring-2 active:ring-moodkin-gold'
                        }`}
                      >
                        <Image
                          src={getImageUrl(asset)}
                          alt={asset.filename}
                          fill
                          className="object-cover pointer-events-none"
                        />
                        {isOnCanvas && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-shrink-0 md:flex-1 flex flex-col items-center justify-center pt-2 md:pt-0 md:min-h-0">
                <div
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative border-2 border-dashed border-moodkin-light-gray rounded-lg overflow-hidden"
                  style={{
                    width: canvasDimensions.width,
                    height: canvasDimensions.height,
                    backgroundColor,
                  }}
                >
                  {canvasImages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-moodkin-gray">
                      <div className="text-center">
                        <Move className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="hidden md:block">Drop images here</p>
                        <p className="md:hidden">Tap images above to add</p>
                      </div>
                    </div>
                  )}

                  {canvasImages.map(img => (
                    <div
                      key={img.assetId}
                      onClick={(e) => handleImageClick(e, img.assetId)}
                      onMouseDown={(e) => handleImageMouseDown(e, img.assetId)}
                      onTouchStart={(e) => handleImageTouchStart(e, img.assetId)}
                      className={`absolute cursor-move touch-none ${
                        selectedImageId === img.assetId ? 'ring-2 ring-moodkin-gold' : ''
                      }`}
                      style={{
                        left: `${img.x}%`,
                        top: `${img.y}%`,
                        width: `${img.width}%`,
                        height: `${img.height}%`,
                        transform: `rotate(${img.rotation}deg)`,
                        zIndex: img.zIndex,
                      }}
                    >
                      <Image
                        src={getImageUrl(img.asset)}
                        alt={img.asset.filename}
                        fill
                        className="object-cover pointer-events-none"
                        draggable={false}
                      />

                      {/* Resize handles (only for selected image) - larger on mobile for touch */}
                      {selectedImageId === img.assetId && (
                        <>
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, img.assetId, 'nw')}
                            onTouchStart={(e) => handleResizeTouchStart(e, img.assetId, 'nw')}
                            className="absolute -top-2 -left-2 w-5 h-5 md:w-3 md:h-3 md:-top-1 md:-left-1 bg-white border-2 border-moodkin-gold rounded-full cursor-nw-resize touch-none"
                          />
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, img.assetId, 'ne')}
                            onTouchStart={(e) => handleResizeTouchStart(e, img.assetId, 'ne')}
                            className="absolute -top-2 -right-2 w-5 h-5 md:w-3 md:h-3 md:-top-1 md:-right-1 bg-white border-2 border-moodkin-gold rounded-full cursor-ne-resize touch-none"
                          />
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, img.assetId, 'sw')}
                            onTouchStart={(e) => handleResizeTouchStart(e, img.assetId, 'sw')}
                            className="absolute -bottom-2 -left-2 w-5 h-5 md:w-3 md:h-3 md:-bottom-1 md:-left-1 bg-white border-2 border-moodkin-gold rounded-full cursor-sw-resize touch-none"
                          />
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, img.assetId, 'se')}
                            onTouchStart={(e) => handleResizeTouchStart(e, img.assetId, 'se')}
                            className="absolute -bottom-2 -right-2 w-5 h-5 md:w-3 md:h-3 md:-bottom-1 md:-right-1 bg-white border-2 border-moodkin-gold rounded-full cursor-se-resize touch-none"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Help tips - show when images exist */}
                {canvasImages.length > 0 && !selectedImage && (
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-moodkin-gray">
                    <span className="hidden md:inline">Tip: Click an image to select, drag corners to resize</span>
                    <span className="md:hidden">Tip: Tap to select, drag corners to resize</span>
                    <button
                      onClick={() => setHelpDialogOpen(true)}
                      className="text-moodkin-gold hover:underline"
                    >
                      More help
                    </button>
                  </div>
                )}

                {/* Controls for selected image */}
                {selectedImage && (
                  <div className="mt-2 md:mt-4 flex flex-col items-center gap-1 md:gap-2">
                    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 bg-moodkin-cream rounded-lg p-1.5 md:p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotate(-15)}
                        title="Rotate left"
                      >
                        <RotateCw className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotate(15)}
                        title="Rotate right"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-moodkin-light-gray mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={bringToFront}
                        title="Bring to front"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={sendToBack}
                        title="Send to back"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-moodkin-light-gray mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deleteSelected}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-moodkin-light-gray mx-1" />
                      <span className="text-xs text-moodkin-gray px-2">
                        Rotation: {selectedImage.rotation}°
                      </span>
                    </div>
                    <p className="hidden md:block text-xs text-moodkin-gray">
                      Drag corners to resize
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 md:p-4 border-t border-moodkin-light-gray/30 bg-moodkin-cream/30">
          <Button
            variant="ghost"
            onClick={currentStepIndex === 0 ? onClose : handleBack}
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{currentStepIndex === 0 ? 'Cancel' : 'Back'}</span>
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            {currentStep === 'canvas' && canvasImages.length > 0 && (
              <span className="md:hidden text-[11px] text-moodkin-gray truncate">
                Drag corners to resize
              </span>
            )}
            {currentStep === 'canvas' && (
              <span className="hidden md:inline text-sm text-moodkin-gray mr-4">
                {canvasImages.length} image{canvasImages.length !== 1 ? 's' : ''}
              </span>
            )}

            {isLastStep ? (
              <Button
                onClick={handleCreate}
                disabled={!canGoNext || isLoading}
                size="sm"
                className="bg-moodkin-gold hover:bg-moodkin-gold/90 text-moodkin-dark px-3 md:px-4 md:h-10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 md:mr-2 animate-spin" />
                    Creating
                    <span className="hidden md:inline">...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5 md:mr-2" />
                    Create
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                size="sm"
                className="bg-moodkin-gold hover:bg-moodkin-gold/90 text-moodkin-dark px-3 md:px-4 md:h-10"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      <FreeformHelpDialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
      />

      {/* Custom Color Picker Modal */}
      {colorPickerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setColorPickerOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-moodkin-light-gray p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-moodkin-dark">Pick a color</h4>
              <button
                type="button"
                onClick={() => setColorPickerOpen(false)}
                className="p-1 rounded-full hover:bg-moodkin-cream text-moodkin-gray hover:text-moodkin-dark transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(pickerColor) ? pickerColor : '#FFFFFF'}
                onChange={(e) => setPickerColor(e.target.value.toUpperCase())}
                className="w-14 h-14 rounded-lg border border-moodkin-light-gray cursor-pointer p-0"
              />
              <input
                type="text"
                value={pickerColor}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#?[0-9A-Fa-f]{0,6}$/.test(v)) {
                    setPickerColor(v.startsWith('#') ? v : `#${v}`)
                  }
                }}
                placeholder="#RRGGBB"
                className="flex-1 px-3 py-2 text-sm border border-moodkin-light-gray rounded-lg focus:outline-none focus:border-moodkin-gold font-mono uppercase"
                maxLength={7}
              />
            </div>
            <div
              className="w-full h-12 rounded-lg border border-moodkin-light-gray mb-4"
              style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(pickerColor) ? pickerColor : '#FFFFFF' }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setColorPickerOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!/^#[0-9A-Fa-f]{6}$/.test(pickerColor)}
                onClick={() => {
                  const c = pickerColor.toUpperCase()
                  setBackgroundColor(c)
                  setCustomColors(prev => prev.includes(c) ? prev : [...prev, c])
                  setColorPickerOpen(false)
                }}
                className="flex-1 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
