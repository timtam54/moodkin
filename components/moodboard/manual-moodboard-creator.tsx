'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Check, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import type { ProjectAsset } from '@/types/database'

export interface ManualMoodboardOptions {
  selectedAssetIds: string[]
  backgroundColor: string
  gridLayout: string
  borderRadius: number
  spacing: number
  aspectRatio: 'portrait' | 'square' | 'landscape'
}

interface ManualMoodboardCreatorProps {
  open: boolean
  onClose: () => void
  onCreate: (options: ManualMoodboardOptions) => Promise<void>
  assets: ProjectAsset[]
  flaggedAssetIds?: Set<string>
  isLoading?: boolean
}

type StepType = 'aspect' | 'gallery' | 'layout' | 'position' | 'border'

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

const DEFAULT_BACKGROUND_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#1A1A1A', label: 'Black' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
  { value: '#2C3E50', label: 'Navy' },
  { value: '#F8E9D6', label: 'Peach' },
  { value: '#E8F4E8', label: 'Mint' },
]

// Layout templates for different image counts
interface LayoutTemplate {
  value: string
  label: string
  imageCount: number // How many images this layout is for
  render: (spacing: number, borderRadius: number) => React.ReactNode
}

// Helper to get image URL (use thumbnail for links)
function getImageUrl(asset: ProjectAsset): string {
  return asset.asset_type === 'link' ? (asset.thumbnail_url || '') : asset.url
}

export function ManualMoodboardCreator({
  open,
  onClose,
  onCreate,
  assets,
  flaggedAssetIds = new Set(),
  isLoading,
}: ManualMoodboardCreatorProps) {
  const [currentStep, setCurrentStep] = useState<StepType>('aspect')
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('square')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [assetOrder, setAssetOrder] = useState<string[]>([]) // Track order for drag-and-drop
  const [backgroundColor, setBackgroundColor] = useState('#1A1A1A')
  const [gridLayout, setGridLayout] = useState('2x2')
  const [borderRadius, setBorderRadius] = useState(12)
  const [spacing, setSpacing] = useState(8)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColors, setCustomColors] = useState<string[]>([])

  // Combined background colors (defaults + custom)
  const BACKGROUND_COLORS = useMemo(() => [
    ...DEFAULT_BACKGROUND_COLORS,
    ...customColors.map(c => ({ value: c, label: 'Custom' }))
  ], [customColors])

  const handleAddCustomColor = (color: string) => {
    const upperColor = color.toUpperCase()
    // Don't add if it already exists
    if (!customColors.includes(upperColor) &&
        !DEFAULT_BACKGROUND_COLORS.some(c => c.value.toUpperCase() === upperColor)) {
      setCustomColors(prev => [...prev, upperColor])
    }
    setBackgroundColor(upperColor)
    setShowColorPicker(false)
  }

  // Filter to visual assets (images and links with thumbnails)
  const visualAssets = useMemo(() =>
    assets.filter(a => a.asset_type === 'image' || (a.asset_type === 'link' && a.thumbnail_url)),
    [assets]
  )

  // Initialize selection when dialog opens with assets
  useEffect(() => {
    if (open && visualAssets.length > 0 && !hasInitialized) {
      const initialIds = visualAssets.slice(0, 4).map(a => a.id)
      setSelectedAssetIds(new Set(initialIds))
      setAssetOrder(initialIds)
      setHasInitialized(true)
    }
    // Reset when closing
    if (!open) {
      setHasInitialized(false)
      setCurrentStep('aspect')
      setAspectRatio('square')
      setAssetOrder([])
    }
  }, [open, visualAssets, hasInitialized])

  // Selected assets in order (respecting drag-and-drop order)
  const selectedAssets = useMemo(() => {
    // Use assetOrder to maintain the order, filtering to only selected assets
    const orderedAssets: ProjectAsset[] = []
    const addedIds = new Set<string>() // Track added IDs to prevent duplicates
    for (const id of assetOrder) {
      if (selectedAssetIds.has(id) && !addedIds.has(id)) {
        const asset = visualAssets.find(a => a.id === id)
        if (asset) {
          orderedAssets.push(asset)
          addedIds.add(id)
        }
      }
    }
    // Add any selected assets not in order (newly selected)
    for (const asset of visualAssets) {
      if (selectedAssetIds.has(asset.id) && !addedIds.has(asset.id)) {
        orderedAssets.push(asset)
        addedIds.add(asset.id)
      }
    }
    return orderedAssets
  }, [visualAssets, selectedAssetIds, assetOrder])

  // Update layout when selection count changes
  useEffect(() => {
    const count = selectedAssetIds.size
    // Set a sensible default layout based on count
    if (count === 1) setGridLayout('1')
    else if (count === 2) setGridLayout('2h')
    else if (count === 3) setGridLayout('3-top')
    else if (count === 4) setGridLayout('2x2')
    else if (count === 5) setGridLayout('5-top2')
    else if (count === 6) setGridLayout('3x2')
    else setGridLayout('auto') // 7+ images use auto grid
  }, [selectedAssetIds.size])

  // Layout templates based on image count
  const getLayoutTemplates = (count: number): LayoutTemplate[] => {
    if (count === 1) {
      return [
        { value: '1', label: 'Full', imageCount: 1, render: () => <div className="w-full h-full bg-white/30 rounded-sm" /> },
      ]
    }
    if (count === 2) {
      return [
        { value: '2h', label: 'Horizontal', imageCount: 2, render: () => (
          <div className="w-full h-full grid grid-cols-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '2v', label: 'Vertical', imageCount: 2, render: () => (
          <div className="w-full h-full grid grid-rows-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '2-big-left', label: 'Big Left', imageCount: 2, render: () => (
          <div className="w-full h-full grid grid-cols-3 gap-0.5">
            <div className="col-span-2 bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '2-big-right', label: 'Big Right', imageCount: 2, render: () => (
          <div className="w-full h-full grid grid-cols-3 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="col-span-2 bg-white/30 rounded-sm" />
          </div>
        )},
      ]
    }
    if (count === 3) {
      return [
        { value: '3-top', label: '1 Top', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-rows-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="grid grid-cols-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '3-bottom', label: '1 Bottom', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-rows-2 gap-0.5">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '3-left', label: '1 Left', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-cols-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="grid grid-rows-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '3-right', label: '1 Right', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-cols-2 gap-0.5">
            <div className="grid grid-rows-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '3-row', label: 'Row', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-cols-3 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '3-col', label: 'Column', imageCount: 3, render: () => (
          <div className="w-full h-full grid grid-rows-3 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
      ]
    }
    if (count === 4) {
      return [
        { value: '2x2', label: '2×2', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '4-top', label: '1 Big Top', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-rows-3 gap-0.5">
            <div className="row-span-2 bg-white/30 rounded-sm" />
            <div className="grid grid-cols-3 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '4-left', label: '1 Big Left', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-cols-2 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="grid grid-rows-3 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '4-row', label: 'Row', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-cols-4 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '4-col', label: 'Column', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-rows-4 gap-0.5">
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
        { value: '4-diagonal', label: 'Diagonal', imageCount: 4, render: () => (
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5">
            <div className="col-span-2 row-span-2 bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="col-span-2 bg-white/30 rounded-sm" />
          </div>
        )},
      ]
    }
    if (count === 5) {
      return [
        { value: '5-top2', label: '2 Top 3 Bottom', imageCount: 5, render: () => (
          <div className="w-full h-full grid grid-rows-2 gap-0.5">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '5-top3', label: '3 Top 2 Bottom', imageCount: 5, render: () => (
          <div className="w-full h-full grid grid-rows-2 gap-0.5">
            <div className="grid grid-cols-3 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
        { value: '5-big', label: '1 Big + 4', imageCount: 5, render: () => (
          <div className="w-full h-full grid grid-cols-3 gap-0.5">
            <div className="col-span-2 row-span-2 bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="col-span-2 grid grid-cols-2 gap-0.5">
              <div className="bg-white/30 rounded-sm" />
              <div className="bg-white/30 rounded-sm" />
            </div>
          </div>
        )},
      ]
    }
    if (count === 6) {
      return [
        { value: '3x2', label: '3×2', imageCount: 6, render: () => (
          <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/30 rounded-sm" />
            ))}
          </div>
        )},
        { value: '2x3', label: '2×3', imageCount: 6, render: () => (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/30 rounded-sm" />
            ))}
          </div>
        )},
        { value: '6-big', label: '1 Big + 5', imageCount: 6, render: () => (
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5">
            <div className="col-span-2 row-span-2 bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        )},
      ]
    }
    if (count >= 7) {
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      return [
        { value: 'auto', label: 'Auto Grid', imageCount: count, render: () => (
          <div
            className="w-full h-full grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {Array.from({ length: Math.min(count, 16) }).map((_, i) => (
              <div key={i} className="bg-white/30 rounded-sm" />
            ))}
          </div>
        )},
      ]
    }
    return []
  }

  const layoutTemplates = useMemo(() => getLayoutTemplates(selectedAssetIds.size), [selectedAssetIds.size])

  // Swap two images by index
  const swapImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const selectedIds = selectedAssets.map(a => a.id)
    const newOrder = [...selectedIds]
    const temp = newOrder[fromIndex]
    newOrder[fromIndex] = newOrder[toIndex]
    newOrder[toIndex] = temp
    setAssetOrder(newOrder)
  }

  if (!open) return null

  const handleCreate = async () => {
    await onCreate({
      selectedAssetIds: Array.from(selectedAssetIds),
      backgroundColor,
      gridLayout,
      borderRadius,
      spacing,
      aspectRatio,
    })
  }

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev)
      if (next.has(assetId)) {
        next.delete(assetId)
        // Remove from order
        setAssetOrder(order => order.filter(id => id !== assetId))
      } else {
        next.add(assetId)
        // Add to order
        setAssetOrder(order => [...order, assetId])
      }
      return next
    })
  }

  const goToStep = (step: StepType) => {
    setCurrentStep(step)
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  const steps: StepType[] = ['aspect', 'gallery', 'layout', 'position', 'border']
  const currentStepIndex = steps.indexOf(currentStep)

  const canProceed = currentStep === 'gallery' ? selectedAssetIds.size >= 1 : true
  const isLastStep = currentStep === 'border'

  // Get aspect ratio class for preview container
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'portrait': return 'aspect-[3/4]'
      case 'landscape': return 'aspect-[4/3]'
      default: return 'aspect-square'
    }
  }

  // Image cell component (draggable on position step)
  const SwappableImage = ({ asset, index, className = '', style = {} }: {
    asset: ProjectAsset | undefined
    index: number
    className?: string
    style?: React.CSSProperties
  }) => {
    if (!asset) return null
    const isDragging = draggingIndex === index
    const isDragOver = dragOverIndex === index && draggingIndex !== index
    const canDrag = currentStep === 'position'

    return (
      <div
        draggable={canDrag}
        onMouseDown={() => {
          if (canDrag) setDraggingIndex(index)
        }}
        onDragStart={(e) => {
          if (!canDrag) {
            e.preventDefault()
            return
          }
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(index))
          setDraggingIndex(index)
        }}
        onDragOver={(e) => {
          if (!canDrag) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (draggingIndex !== null && draggingIndex !== index) {
            setDragOverIndex(index)
          }
        }}
        onDragEnter={(e) => {
          if (!canDrag) return
          e.preventDefault()
          if (draggingIndex !== null && draggingIndex !== index) {
            setDragOverIndex(index)
          }
        }}
        onDragLeave={() => {
          setDragOverIndex(null)
        }}
        onDrop={(e) => {
          if (!canDrag) return
          e.preventDefault()
          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
          if (!isNaN(fromIndex) && fromIndex !== index) {
            swapImages(fromIndex, index)
          }
          setDraggingIndex(null)
          setDragOverIndex(null)
        }}
        onDragEnd={() => {
          setDraggingIndex(null)
          setDragOverIndex(null)
        }}
        className={`relative w-full h-full overflow-hidden transition-none ${className} ${
          canDrag ? 'cursor-grab active:cursor-grabbing select-none' : ''
        } ${isDragging ? 'opacity-40 scale-95' : ''} ${
          isDragOver ? 'ring-4 ring-moodkin-gold scale-105' : ''
        }`}
        style={{ ...style, borderRadius: `${borderRadius}px` }}
      >
        <Image
          src={getImageUrl(asset)}
          alt=""
          fill
          className="object-cover pointer-events-none select-none"
          draggable={false}
          style={{ borderRadius: `${borderRadius}px` }}
        />
        {canDrag && (
          <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold pointer-events-none ${
            isDragging ? 'bg-moodkin-gold text-black' : 'bg-black/60 text-white'
          }`}>
            {index + 1}
          </div>
        )}
      </div>
    )
  }

  // Render live preview based on selected layout
  const renderLivePreview = () => {
    const previewAssets = selectedAssets
    const count = previewAssets.length

    // Single image
    if (gridLayout === '1' || count === 1) {
      return (
        <SwappableImage asset={previewAssets[0]} index={0} className="w-full h-full" />
      )
    }

    // 2 images layouts
    if (gridLayout === '2h') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <SwappableImage key={`preview-2h-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2v') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <SwappableImage key={`preview-2v-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2-big-left') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} className="col-span-2" />
          <SwappableImage asset={previewAssets[1]} index={1} />
        </div>
      )
    }
    if (gridLayout === '2-big-right') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} />
          <SwappableImage asset={previewAssets[1]} index={1} className="col-span-2" />
        </div>
      )
    }

    // 3 images layouts
    if (gridLayout === '3-top') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <SwappableImage asset={previewAssets[1]} index={1} />
            <SwappableImage asset={previewAssets[2]} index={2} />
          </div>
        </div>
      )
    }
    if (gridLayout === '3-bottom') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <SwappableImage asset={previewAssets[0]} index={0} />
            <SwappableImage asset={previewAssets[1]} index={1} />
          </div>
          <SwappableImage asset={previewAssets[2]} index={2} />
        </div>
      )
    }
    if (gridLayout === '3-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <SwappableImage asset={previewAssets[1]} index={1} />
            <SwappableImage asset={previewAssets[2]} index={2} />
          </div>
        </div>
      )
    }
    if (gridLayout === '3-right') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <SwappableImage asset={previewAssets[0]} index={0} />
            <SwappableImage asset={previewAssets[1]} index={1} />
          </div>
          <SwappableImage asset={previewAssets[2]} index={2} />
        </div>
      )
    }
    if (gridLayout === '3-row') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a, i) => (
            <SwappableImage key={`preview-3row-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '3-col') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a, i) => (
            <SwappableImage key={`preview-3col-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }

    // 4 images layouts
    if (gridLayout === '2x2') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <SwappableImage key={`preview-2x2-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-top') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} className="row-span-2" />
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a, i) => (
              <SwappableImage key={`preview-4top-${i}`} asset={a} index={i + 1} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-rows-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a, i) => (
              <SwappableImage key={`preview-4left-${i}`} asset={a} index={i + 1} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-row') {
      return (
        <div className="w-full h-full grid grid-cols-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <SwappableImage key={`preview-4row-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-col') {
      return (
        <div className="w-full h-full grid grid-rows-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <SwappableImage key={`preview-4col-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-diagonal') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          <SwappableImage asset={previewAssets[1]} index={1} />
          <SwappableImage asset={previewAssets[2]} index={2} />
          <SwappableImage asset={previewAssets[3]} index={3} className="col-span-2" />
        </div>
      )
    }

    // 5 images layouts
    if (gridLayout === '5-top2') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(0, 2).map((a, i) => (
              <SwappableImage key={`preview-5top2a-${i}`} asset={a} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(2, 5).map((a, i) => (
              <SwappableImage key={`preview-5top2b-${i}`} asset={a} index={i + 2} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '5-top3') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(0, 3).map((a, i) => (
              <SwappableImage key={`preview-5top3a-${i}`} asset={a} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(3, 5).map((a, i) => (
              <SwappableImage key={`preview-5top3b-${i}`} asset={a} index={i + 3} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '5-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          {previewAssets.slice(1, 5).map((a, i) => (
            <SwappableImage key={`preview-5big-${i}`} asset={a} index={i + 1} />
          ))}
        </div>
      )
    }

    // 6+ images layouts
    if (gridLayout === '3x2') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a, i) => (
            <SwappableImage key={`preview-3x2-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2x3') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a, i) => (
            <SwappableImage key={`preview-2x3-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '6-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <SwappableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          {previewAssets.slice(1, 6).map((a, i) => (
            <SwappableImage key={`preview-6big-${i}`} asset={a} index={i + 1} />
          ))}
        </div>
      )
    }

    // Default: simple grid
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    return (
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${spacing}px`,
        }}
      >
        {previewAssets.map((a, i) => (
          <SwappableImage key={`preview-auto-${i}-${a.id}`} asset={a} index={i} />
        ))}
      </div>
    )
  }

  // Check if we're in a step that needs side-by-side layout (on desktop, gallery also gets side-by-side)
  const isSideBySideStep = currentStep === 'layout' || currentStep === 'position' || currentStep === 'border'
  const isGalleryStep = currentStep === 'gallery'

  // Render the step controls (for side-by-side layout)
  const renderStepControls = () => {
    if (currentStep === 'layout') {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-white/50 text-sm mb-3">Layout</p>
            <div className="grid grid-cols-3 gap-2">
              {layoutTemplates.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setGridLayout(layout.value)}
                  className={`aspect-square p-1 rounded-xl border-2 transition-all ${
                    gridLayout === layout.value
                      ? 'border-white bg-white/10'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="w-full h-full text-white/60">
                    {layout.render(spacing, borderRadius)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/50 text-sm mb-3">Background Color</p>
            <div className="flex gap-2 flex-wrap">
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
              {showColorPicker ? (
                <input
                  type="color"
                  autoFocus
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30"
                  onChange={(e) => handleAddCustomColor(e.target.value)}
                  onBlur={() => setShowColorPicker(false)}
                />
              ) : (
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-8 h-8 rounded-lg border-2 border-dashed border-white/30 hover:border-white/50 transition-all flex items-center justify-center"
                  title="Custom color"
                >
                  <Plus className="w-4 h-4 text-white/50" />
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }
    if (currentStep === 'position') {
      return (
        <div className="space-y-4">
          <p className="text-white/50 text-sm">Drag and drop images to swap positions</p>
          <p className="text-white/40 text-xs">
            {draggingIndex !== null
              ? `Dragging image ${draggingIndex + 1} - drop on another to swap`
              : 'Numbers show position in the layout'}
          </p>
        </div>
      )
    }
    if (currentStep === 'border') {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-white/50 text-sm mb-3">Spacing</p>
            <input
              type="range"
              min="0"
              max="32"
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <div>
            <p className="text-white/50 text-sm mb-3">Corner Radius</p>
            <input
              type="range"
              min="0"
              max="32"
              value={borderRadius}
              onChange={(e) => setBorderRadius(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <div>
            <p className="text-white/50 text-sm mb-3">Background Color</p>
            <div className="flex gap-2 flex-wrap">
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
              {showColorPicker ? (
                <input
                  type="color"
                  autoFocus
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30"
                  onChange={(e) => handleAddCustomColor(e.target.value)}
                  onBlur={() => setShowColorPicker(false)}
                />
              ) : (
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-8 h-8 rounded-lg border-2 border-dashed border-white/30 hover:border-white/50 transition-all flex items-center justify-center"
                  title="Custom color"
                >
                  <Plus className="w-4 h-4 text-white/50" />
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
      {/* Header with close button and step indicator */}
      <div className="relative flex items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute left-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          disabled={isLoading}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <button
              key={step}
              onClick={() => goToStep(step)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStepIndex
                  ? 'w-6 bg-white'
                  : index < currentStepIndex
                  ? 'bg-moodkin-gold'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      {/* Desktop side-by-side layout for gallery step */}
      {isGalleryStep ? (
        <>
          {/* Mobile: vertical layout */}
          <div className="md:hidden flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md px-4">
                <p className="text-white/70 text-center mb-4">
                  {selectedAssetIds.size} photos selected
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
                  {visualAssets.map((asset) => {
                    const isSelected = selectedAssetIds.has(asset.id)
                    const isFlagged = flaggedAssetIds.has(asset.id)
                    const imgUrl = getImageUrl(asset)
                    if (!imgUrl) return null
                    return (
                      <button
                        key={asset.id}
                        onClick={() => toggleAsset(asset.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-moodkin-gold scale-95'
                            : 'border-transparent hover:border-white/30'
                        } ${isFlagged ? 'opacity-50' : ''}`}
                      >
                        <Image
                          src={imgUrl}
                          alt={asset.filename}
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-moodkin-gold rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {isFlagged && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <span className="text-xs text-white bg-red-500/80 px-2 py-1 rounded">Flagged</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Mobile bottom panel */}
            <div className="bg-[#2a2a2a] rounded-t-3xl">
              <div className="flex items-center justify-center gap-6 py-4 border-b border-white/10 overflow-x-auto">
                <button
                  onClick={() => goToStep('aspect')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Aspect
                </button>
                <button
                  onClick={() => goToStep('gallery')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white"
                >
                  Gallery
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
                </button>
                <button
                  onClick={() => goToStep('layout')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Layout
                </button>
                <button
                  onClick={() => goToStep('position')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Position
                </button>
                <button
                  onClick={() => goToStep('border')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Border
                </button>
              </div>

              <div className="p-4 pb-8 min-h-[100px]">
                <div className="text-center text-white/50 text-sm">
                  Tap photos to select or deselect
                </div>
              </div>

              <div className="px-4 pb-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => goToStep('aspect')}
                  className="flex-shrink-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="primary"
                  onClick={() => goToStep('layout')}
                  disabled={!canProceed}
                  className="flex-1 py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop: side-by-side layout */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {/* Left side - Photo grid */}
            <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-4xl lg:max-w-6xl">
                <p className="text-white/70 text-center mb-4">
                  {selectedAssetIds.size} photos selected
                </p>
                <div className="grid grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {visualAssets.map((asset) => {
                    const isSelected = selectedAssetIds.has(asset.id)
                    const isFlagged = flaggedAssetIds.has(asset.id)
                    const imgUrl = getImageUrl(asset)
                    if (!imgUrl) return null
                    return (
                      <button
                        key={asset.id}
                        onClick={() => toggleAsset(asset.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-moodkin-gold scale-95'
                            : 'border-transparent hover:border-white/30'
                        } ${isFlagged ? 'opacity-50' : ''}`}
                      >
                        <Image
                          src={imgUrl}
                          alt={asset.filename}
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-moodkin-gold rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {isFlagged && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <span className="text-xs text-white bg-red-500/80 px-2 py-1 rounded">Flagged</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right side - Controls panel */}
            <div className="w-80 bg-[#2a2a2a] p-6 overflow-y-auto flex flex-col">
              {/* Step tabs */}
              <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button
                  onClick={() => goToStep('aspect')}
                  className="text-sm font-medium transition-colors text-white/50 hover:text-white/70"
                >
                  Aspect
                </button>
                <button
                  onClick={() => goToStep('gallery')}
                  className="text-sm font-medium transition-colors text-white"
                >
                  Gallery
                </button>
                <button
                  onClick={() => goToStep('layout')}
                  className="text-sm font-medium transition-colors text-white/50 hover:text-white/70"
                >
                  Layout
                </button>
              </div>

              {/* Step content */}
              <div className="flex-1">
                <p className="text-white/50 text-sm">
                  Click photos to select or deselect them for your moodboard.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-4 border-t border-white/10 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => goToStep('aspect')}
                  className="flex-shrink-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="primary"
                  onClick={() => goToStep('layout')}
                  disabled={!canProceed}
                  className="flex-1 py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : isSideBySideStep ? (
        // Side-by-side layout for layout/position/border steps
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Preview */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div
              className={`${
                aspectRatio === 'portrait' ? 'h-full max-h-[80vh] aspect-[3/4]' :
                aspectRatio === 'landscape' ? 'w-full max-w-[80%] aspect-[4/3]' :
                'w-full max-w-[60vh] aspect-square'
              } rounded-2xl overflow-hidden`}
              style={{ backgroundColor }}
            >
              <div
                className="w-full h-full"
                style={{ padding: `${spacing}px` }}
              >
                {renderLivePreview()}
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="w-80 bg-[#2a2a2a] p-6 overflow-y-auto flex flex-col">
            {/* Step tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
              {['layout', 'position', 'border'].map((step) => (
                <button
                  key={step}
                  onClick={() => goToStep(step as StepType)}
                  className={`text-sm font-medium capitalize transition-colors ${
                    currentStep === step ? 'text-white' : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Step controls */}
            <div className="flex-1">
              {renderStepControls()}
            </div>

            {/* Action buttons */}
            <div className="pt-4 mt-4 border-t border-white/10 flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep(steps[currentStepIndex - 1])}
                className="flex-shrink-0 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="primary"
                onClick={isLastStep ? handleCreate : () => goToStep(steps[currentStepIndex + 1])}
                disabled={isLoading || !canProceed}
                className="flex-1 py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : isLastStep ? (
                  'Create Moodboard'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Aspect step - mobile vertical, desktop side-by-side
        <>
          {/* Mobile: vertical layout */}
          <div className="md:hidden flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md px-4">
                <p className="text-white/70 text-center mb-8 text-lg">
                  Choose output aspect ratio
                </p>
                <div className="flex justify-center gap-6">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all ${
                        aspectRatio === ratio.value
                          ? 'bg-white/20 ring-2 ring-moodkin-gold'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`${aspectRatio === ratio.value ? 'text-moodkin-gold' : 'text-white/60'}`}>
                        {ratio.icon}
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${aspectRatio === ratio.value ? 'text-white' : 'text-white/70'}`}>
                          {ratio.label}
                        </p>
                        <p className="text-white/40 text-sm">{ratio.dimensions}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile bottom panel */}
            <div className="bg-[#2a2a2a] rounded-t-3xl">
              <div className="flex items-center justify-center gap-6 py-4 border-b border-white/10 overflow-x-auto">
                <button
                  onClick={() => goToStep('aspect')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white"
                >
                  Aspect
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
                </button>
                <button
                  onClick={() => goToStep('gallery')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Gallery
                </button>
                <button
                  onClick={() => goToStep('layout')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Layout
                </button>
                <button
                  onClick={() => goToStep('position')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Position
                </button>
                <button
                  onClick={() => goToStep('border')}
                  className="text-sm font-medium transition-colors relative whitespace-nowrap text-white/50"
                >
                  Border
                </button>
              </div>

              <div className="p-4 pb-8 min-h-[100px]">
                <div className="text-center text-white/50 text-sm">
                  Select the shape for your moodboard output
                </div>
              </div>

              <div className="px-4 pb-6 flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => goToStep('gallery')}
                  className="flex-1 py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop: side-by-side layout */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {/* Left side - Aspect ratio selection */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-lg">
                <p className="text-white/70 text-center mb-8 text-lg">
                  Choose output aspect ratio
                </p>
                <div className="flex justify-center gap-6">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all ${
                        aspectRatio === ratio.value
                          ? 'bg-white/20 ring-2 ring-moodkin-gold'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`${aspectRatio === ratio.value ? 'text-moodkin-gold' : 'text-white/60'}`}>
                        {ratio.icon}
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${aspectRatio === ratio.value ? 'text-white' : 'text-white/70'}`}>
                          {ratio.label}
                        </p>
                        <p className="text-white/40 text-sm">{ratio.dimensions}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Controls panel */}
            <div className="w-80 bg-[#2a2a2a] p-6 overflow-y-auto flex flex-col">
              {/* Step tabs */}
              <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button
                  onClick={() => goToStep('aspect')}
                  className="text-sm font-medium transition-colors text-white"
                >
                  Aspect
                </button>
                <button
                  onClick={() => goToStep('gallery')}
                  className="text-sm font-medium transition-colors text-white/50 hover:text-white/70"
                >
                  Gallery
                </button>
                <button
                  onClick={() => goToStep('layout')}
                  className="text-sm font-medium transition-colors text-white/50 hover:text-white/70"
                >
                  Layout
                </button>
              </div>

              {/* Step content */}
              <div className="flex-1">
                <p className="text-white/50 text-sm">
                  Select the shape for your moodboard output.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-4 border-t border-white/10 flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => goToStep('gallery')}
                  className="flex-1 py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
