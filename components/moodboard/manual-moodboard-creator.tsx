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
}

interface ManualMoodboardCreatorProps {
  open: boolean
  onClose: () => void
  onCreate: (options: ManualMoodboardOptions) => Promise<void>
  assets: ProjectAsset[]
  flaggedAssetIds?: Set<string>
  isLoading?: boolean
}

type StepType = 'gallery' | 'layout' | 'position' | 'border'

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
  const [currentStep, setCurrentStep] = useState<StepType>('gallery')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [assetOrder, setAssetOrder] = useState<string[]>([]) // Track order for drag-and-drop
  const [backgroundColor, setBackgroundColor] = useState('#1A1A1A')
  const [gridLayout, setGridLayout] = useState('2x2')
  const [borderRadius, setBorderRadius] = useState(12)
  const [spacing, setSpacing] = useState(8)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
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
      setCurrentStep('gallery')
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

  if (!open) return null

  const handleCreate = async () => {
    await onCreate({
      selectedAssetIds: Array.from(selectedAssetIds),
      backgroundColor,
      gridLayout,
      borderRadius,
      spacing,
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

  // Drag and drop handlers for swapping images
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (_e: React.DragEvent, index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      // Swap the assets in the order
      const selectedIds = selectedAssets.map(a => a.id)
      const newOrder = [...selectedIds]
      const temp = newOrder[draggedIndex]
      newOrder[draggedIndex] = newOrder[dropIndex]
      newOrder[dropIndex] = temp

      // Update the full assetOrder by replacing the selected portion
      setAssetOrder(prevOrder => {
        const result = [...prevOrder]
        // Map old positions to new positions
        selectedIds.forEach((id, i) => {
          const pos = result.indexOf(id)
          if (pos !== -1) {
            result[pos] = newOrder[i]
          }
        })
        return newOrder
      })
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const goToStep = (step: StepType) => {
    setCurrentStep(step)
  }

  const steps: StepType[] = ['gallery', 'layout', 'position', 'border']
  const currentStepIndex = steps.indexOf(currentStep)

  const canProceed = currentStep === 'gallery' ? selectedAssetIds.size >= 1 : true
  const isLastStep = currentStep === 'border'

  // Image cell component (draggable only on position step)
  const DraggableImage = ({ asset, index, className = '', style = {} }: {
    asset: ProjectAsset | undefined
    index: number
    className?: string
    style?: React.CSSProperties
  }) => {
    if (!asset) return null
    const isDragging = draggedIndex === index
    const isDragOver = dragOverIndex === index
    const canDrag = currentStep === 'position'

    return (
      <div
        draggable={canDrag}
        onDragStart={canDrag ? (e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(index))
          handleDragStart(index)
        } : undefined}
        onDragOver={canDrag ? (e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          handleDragOver(e, index)
        } : undefined}
        onDragLeave={canDrag ? handleDragLeave : undefined}
        onDrop={canDrag ? (e) => handleDrop(e, index) : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
        className={`relative overflow-hidden transition-all ${className} ${
          canDrag ? 'cursor-grab active:cursor-grabbing' : ''
        } ${isDragging ? 'opacity-50 scale-95' : ''} ${
          isDragOver ? 'ring-2 ring-moodkin-gold ring-offset-2 ring-offset-transparent' : ''
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
        {/* Position number overlay on position step */}
        {canDrag && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs font-bold">
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
        <DraggableImage asset={previewAssets[0]} index={0} className="w-full h-full" />
      )
    }

    // 2 images layouts
    if (gridLayout === '2h') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <DraggableImage key={`preview-2h-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2v') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <DraggableImage key={`preview-2v-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2-big-left') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} className="col-span-2" />
          <DraggableImage asset={previewAssets[1]} index={1} />
        </div>
      )
    }
    if (gridLayout === '2-big-right') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} />
          <DraggableImage asset={previewAssets[1]} index={1} className="col-span-2" />
        </div>
      )
    }

    // 3 images layouts
    if (gridLayout === '3-top') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <DraggableImage asset={previewAssets[1]} index={1} />
            <DraggableImage asset={previewAssets[2]} index={2} />
          </div>
        </div>
      )
    }
    if (gridLayout === '3-bottom') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <DraggableImage asset={previewAssets[0]} index={0} />
            <DraggableImage asset={previewAssets[1]} index={1} />
          </div>
          <DraggableImage asset={previewAssets[2]} index={2} />
        </div>
      )
    }
    if (gridLayout === '3-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <DraggableImage asset={previewAssets[1]} index={1} />
            <DraggableImage asset={previewAssets[2]} index={2} />
          </div>
        </div>
      )
    }
    if (gridLayout === '3-right') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <DraggableImage asset={previewAssets[0]} index={0} />
            <DraggableImage asset={previewAssets[1]} index={1} />
          </div>
          <DraggableImage asset={previewAssets[2]} index={2} />
        </div>
      )
    }
    if (gridLayout === '3-row') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a, i) => (
            <DraggableImage key={`preview-3row-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '3-col') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a, i) => (
            <DraggableImage key={`preview-3col-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }

    // 4 images layouts
    if (gridLayout === '2x2') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <DraggableImage key={`preview-2x2-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-top') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} className="row-span-2" />
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a, i) => (
              <DraggableImage key={`preview-4top-${i}`} asset={a} index={i + 1} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} />
          <div className="grid grid-rows-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a, i) => (
              <DraggableImage key={`preview-4left-${i}`} asset={a} index={i + 1} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-row') {
      return (
        <div className="w-full h-full grid grid-cols-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <DraggableImage key={`preview-4row-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-col') {
      return (
        <div className="w-full h-full grid grid-rows-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a, i) => (
            <DraggableImage key={`preview-4col-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '4-diagonal') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          <DraggableImage asset={previewAssets[1]} index={1} />
          <DraggableImage asset={previewAssets[2]} index={2} />
          <DraggableImage asset={previewAssets[3]} index={3} className="col-span-2" />
        </div>
      )
    }

    // 5 images layouts
    if (gridLayout === '5-top2') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(0, 2).map((a, i) => (
              <DraggableImage key={`preview-5top2a-${i}`} asset={a} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(2, 5).map((a, i) => (
              <DraggableImage key={`preview-5top2b-${i}`} asset={a} index={i + 2} />
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
              <DraggableImage key={`preview-5top3a-${i}`} asset={a} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(3, 5).map((a, i) => (
              <DraggableImage key={`preview-5top3b-${i}`} asset={a} index={i + 3} />
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '5-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          {previewAssets.slice(1, 5).map((a, i) => (
            <DraggableImage key={`preview-5big-${i}`} asset={a} index={i + 1} />
          ))}
        </div>
      )
    }

    // 6+ images layouts
    if (gridLayout === '3x2') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a, i) => (
            <DraggableImage key={`preview-3x2-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '2x3') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a, i) => (
            <DraggableImage key={`preview-2x3-${i}`} asset={a} index={i} />
          ))}
        </div>
      )
    }
    if (gridLayout === '6-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <DraggableImage asset={previewAssets[0]} index={0} className="col-span-2 row-span-2" />
          {previewAssets.slice(1, 6).map((a, i) => (
            <DraggableImage key={`preview-6big-${i}`} asset={a} index={i + 1} />
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
          <DraggableImage key={`preview-auto-${i}-${a.id}`} asset={a} index={i} />
        ))}
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
          className="absolute top-4 left-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
          disabled={isLoading}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Step indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
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

        {/* Preview based on step */}
        {currentStep === 'gallery' ? (
          <div className="w-full max-w-md md:max-w-4xl lg:max-w-6xl px-4">
            <p className="text-white/70 text-center mb-4">
              {selectedAssetIds.size} photos selected
            </p>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
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
        ) : (
          // Layout, Position and Border steps show the preview
          <div
            className="w-full max-w-md md:max-w-2xl lg:max-w-4xl max-h-[50vh] aspect-square rounded-2xl overflow-hidden"
            style={{ backgroundColor }}
          >
            <div
              className="w-full h-full"
              style={{ padding: `${spacing}px` }}
            >
              {renderLivePreview()}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="relative bg-[#2a2a2a] rounded-t-3xl">
        {/* Step Tabs */}
        <div className="flex items-center justify-center gap-8 py-4 border-b border-white/10">
          <button
            onClick={() => goToStep('gallery')}
            className={`text-sm font-medium transition-colors relative ${
              currentStep === 'gallery' ? 'text-white' : 'text-white/50'
            }`}
          >
            Gallery
            {currentStep === 'gallery' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => goToStep('layout')}
            className={`text-sm font-medium transition-colors relative ${
              currentStep === 'layout' ? 'text-white' : 'text-white/50'
            }`}
          >
            Layout
            {currentStep === 'layout' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => goToStep('position')}
            className={`text-sm font-medium transition-colors relative ${
              currentStep === 'position' ? 'text-white' : 'text-white/50'
            }`}
          >
            Position
            {currentStep === 'position' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => goToStep('border')}
            className={`text-sm font-medium transition-colors relative ${
              currentStep === 'border' ? 'text-white' : 'text-white/50'
            }`}
          >
            Border
            {currentStep === 'border' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={isLastStep ? handleCreate : () => goToStep(steps[currentStepIndex + 1])}
            disabled={isLoading || !canProceed}
            className="ml-4 text-white/80 hover:text-white disabled:text-white/30"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          </button>
        </div>

        {/* Step Content */}
        <div className="p-4 pb-8 min-h-[150px] overflow-y-auto">
          {currentStep === 'gallery' && (
            <div className="text-center text-white/50 text-sm">
              Tap photos to select or deselect
            </div>
          )}

          {currentStep === 'layout' && (
            <div className="space-y-4">
              {/* Layout templates */}
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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

              {/* Color Palette */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
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
          )}

          {currentStep === 'position' && (
            <div className="space-y-4">
              <p className="text-center text-white/70 text-sm">
                Drag images in the preview to swap their positions
              </p>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {selectedAssets.map((asset, index) => {
                  const imgUrl = getImageUrl(asset)
                  if (!imgUrl) return null
                  return (
                    <div
                      key={`position-thumb-${index}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', String(index))
                        handleDragStart(index)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        handleDragOver(e, index)
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${dragOverIndex === index ? 'ring-2 ring-moodkin-gold' : ''}`}
                    >
                      <Image
                        src={imgUrl}
                        alt=""
                        fill
                        className="object-cover pointer-events-none"
                        draggable={false}
                      />
                      <div className="absolute top-1 left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-white/40 text-xs">
                Numbers show position in the layout (top-left to bottom-right)
              </p>
            </div>
          )}

          {currentStep === 'border' && (
            <div className="space-y-6">
              {/* Spacing/Gap Slider */}
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
                    max="32"
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

              {/* Color Palette */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center text-white/60">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="8" r="6" />
                    </svg>
                  </div>
                  <div className="flex-1 flex gap-2 flex-wrap">
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
            </div>
          )}
        </div>

        {/* Navigation / Create Button */}
        <div className="px-4 pb-6 flex gap-3">
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => goToStep(steps[currentStepIndex - 1])}
              className="flex-shrink-0 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
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
              `Create Moodboard (${selectedAssetIds.size} photos)`
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
  )
}
