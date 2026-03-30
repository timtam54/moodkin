'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Check, Loader2, ChevronLeft, ChevronRight, RotateCw, ArrowUp, ArrowDown, Trash2, Move, HelpCircle } from 'lucide-react'
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

const STEPS: { id: StepType; label: string; description: string }[] = [
  { id: 'aspect', label: 'Size', description: 'Choose the canvas size for your moodboard' },
  { id: 'canvas', label: 'Canvas', description: 'Drag photos onto the canvas and arrange them freely, drag corners to resize' },
]

const DEFAULT_BACKGROUND_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#1A1A1A', label: 'Black' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
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
    }
  }, [open])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-moodkin-light-gray/30">
          <div>
            <h2 className="text-lg font-semibold text-moodkin-dark">Blank Piece of Paper</h2>
            <p className="text-sm text-moodkin-gray">{STEPS[currentStepIndex].description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-moodkin-cream transition-colors"
          >
            <X className="w-5 h-5 text-moodkin-gray" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-moodkin-light-gray/30">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => index < currentStepIndex && setCurrentStep(step.id)}
                disabled={index > currentStepIndex}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
        <div className="flex-1 overflow-y-auto p-6">
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
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Canvas Editor */}
          {currentStep === 'canvas' && (
            <div className="flex flex-col md:flex-row gap-6 md:h-[500px]">
              {/* Image Gallery - Top on mobile, Left sidebar on desktop */}
              <div className="w-full md:w-48 flex-shrink-0 md:border-r border-b md:border-b-0 border-moodkin-light-gray/30 pb-4 md:pb-0 md:pr-4 overflow-x-auto md:overflow-y-auto">
                <div className="flex items-center justify-between sticky top-0 bg-white py-1 mb-3">
                  <h3 className="text-sm font-medium text-moodkin-dark">
                    <span className="hidden md:inline">Drag images to canvas</span>
                    <span className="md:hidden">Tap to add images</span>
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
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] md:min-h-0">
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
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-moodkin-cream rounded-lg p-2">
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
                    <p className="text-xs text-moodkin-gray">
                      <span className="hidden md:inline">Drag corners to resize</span>
                      <span className="md:hidden">Drag corner circles to resize</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-moodkin-light-gray/30 bg-moodkin-cream/30">
          <Button
            variant="ghost"
            onClick={currentStepIndex === 0 ? onClose : handleBack}
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{currentStepIndex === 0 ? 'Cancel' : 'Back'}</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep === 'canvas' && (
              <span className="text-sm text-moodkin-gray mr-4">
                {canvasImages.length} image{canvasImages.length !== 1 ? 's' : ''}
              </span>
            )}

            {isLastStep ? (
              <Button
                onClick={handleCreate}
                disabled={!canGoNext || isLoading}
                className="bg-moodkin-gold hover:bg-moodkin-gold/90 text-moodkin-dark"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="bg-moodkin-gold hover:bg-moodkin-gold/90 text-moodkin-dark"
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
    </div>
  )
}
