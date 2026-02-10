'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
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

type StepType = 'gallery' | 'layout' | 'border'

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
  const [backgroundColor, setBackgroundColor] = useState('#1A1A1A')
  const [gridLayout, setGridLayout] = useState('2x2')
  const [borderRadius, setBorderRadius] = useState(12)
  const [spacing, setSpacing] = useState(8)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Filter to visual assets (images and links with thumbnails)
  const visualAssets = useMemo(() =>
    assets.filter(a => a.asset_type === 'image' || (a.asset_type === 'link' && a.thumbnail_url)),
    [assets]
  )

  // Initialize selection when dialog opens with assets
  useEffect(() => {
    if (open && visualAssets.length > 0 && !hasInitialized) {
      setSelectedAssetIds(new Set(visualAssets.slice(0, 4).map(a => a.id)))
      setHasInitialized(true)
    }
    // Reset when closing
    if (!open) {
      setHasInitialized(false)
      setCurrentStep('gallery')
    }
  }, [open, visualAssets, hasInitialized])

  // Selected assets in order
  const selectedAssets = useMemo(() =>
    visualAssets.filter(a => selectedAssetIds.has(a.id)),
    [visualAssets, selectedAssetIds]
  )

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
    else setGridLayout('2x2')
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
    if (count >= 6) {
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
      } else {
        next.add(assetId)
      }
      return next
    })
  }

  const goToStep = (step: StepType) => {
    setCurrentStep(step)
  }

  const steps: StepType[] = ['gallery', 'layout', 'border']
  const currentStepIndex = steps.indexOf(currentStep)

  const canProceed = currentStep === 'gallery' ? selectedAssetIds.size >= 1 : true
  const isLastStep = currentStep === 'border'

  // Render live preview based on selected layout
  const renderLivePreview = () => {
    const previewAssets = selectedAssets
    const count = previewAssets.length

    const imageStyle = {
      borderRadius: `${borderRadius}px`,
    }

    // Single image
    if (gridLayout === '1' || count === 1) {
      return (
        <div className="w-full h-full relative overflow-hidden" style={imageStyle}>
          {previewAssets[0] && (
            <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />
          )}
        </div>
      )
    }

    // 2 images layouts
    if (gridLayout === '2h') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '2v') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 2).map((a, i) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '2-big-left') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <div className="col-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
        </div>
      )
    }
    if (gridLayout === '2-big-right') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="col-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
        </div>
      )
    }

    // 3 images layouts
    if (gridLayout === '3-top') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[2] && <Image src={getImageUrl(previewAssets[2])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
          </div>
        </div>
      )
    }
    if (gridLayout === '3-bottom') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
          </div>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[2] && <Image src={getImageUrl(previewAssets[2])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
        </div>
      )
    }
    if (gridLayout === '3-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[2] && <Image src={getImageUrl(previewAssets[2])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
          </div>
        </div>
      )
    }
    if (gridLayout === '3-right') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
            <div className="relative overflow-hidden" style={imageStyle}>
              {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
            </div>
          </div>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[2] && <Image src={getImageUrl(previewAssets[2])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
        </div>
      )
    }
    if (gridLayout === '3-row') {
      return (
        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '3-col') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 3).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }

    // 4 images layouts
    if (gridLayout === '2x2') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '4-top') {
      return (
        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacing}px` }}>
          <div className="row-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-left') {
      return (
        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="grid grid-rows-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(1, 4).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '4-row') {
      return (
        <div className="w-full h-full grid grid-cols-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '4-col') {
      return (
        <div className="w-full h-full grid grid-rows-4" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 4).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '4-diagonal') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <div className="col-span-2 row-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[1] && <Image src={getImageUrl(previewAssets[1])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="relative overflow-hidden" style={imageStyle}>
            {previewAssets[2] && <Image src={getImageUrl(previewAssets[2])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          <div className="col-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[3] && <Image src={getImageUrl(previewAssets[3])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
        </div>
      )
    }

    // 5 images layouts
    if (gridLayout === '5-top2') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(0, 2).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(2, 5).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '5-top3') {
      return (
        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(0, 3).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            {previewAssets.slice(3, 5).map((a) => (
              <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
                <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (gridLayout === '5-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          <div className="col-span-2 row-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          {previewAssets.slice(1, 5).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }

    // 6+ images layouts
    if (gridLayout === '3x2') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '2x3') {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-3" style={{ gap: `${spacing}px` }}>
          {previewAssets.slice(0, 6).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
          ))}
        </div>
      )
    }
    if (gridLayout === '6-big') {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacing}px` }}>
          <div className="col-span-2 row-span-2 relative overflow-hidden" style={imageStyle}>
            {previewAssets[0] && <Image src={getImageUrl(previewAssets[0])} alt="" fill className="object-cover" style={imageStyle} />}
          </div>
          {previewAssets.slice(1, 6).map((a) => (
            <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
              <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
            </div>
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
        {previewAssets.map((a) => (
          <div key={a.id} className="relative overflow-hidden" style={imageStyle}>
            <Image src={getImageUrl(a)} alt="" fill className="object-cover" style={imageStyle} />
          </div>
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
          <div className="w-full max-w-md">
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
        ) : (
          // Layout and Border steps show the preview
          <div
            className="w-full max-w-md aspect-square rounded-2xl overflow-hidden"
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
        <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto">
          {currentStep === 'gallery' && (
            <div className="text-center text-white/50 text-sm">
              Tap photos to select or deselect
            </div>
          )}

          {currentStep === 'layout' && (
            <div className="grid grid-cols-4 gap-3">
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
                  <div className="flex-1 flex gap-2">
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
