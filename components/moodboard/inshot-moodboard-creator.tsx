'use client'

import { useState, useMemo } from 'react'
import { X, Check, Loader2, RotateCcw, ChevronLeft, ChevronRight, Grid3X3, Layers, AlignVerticalJustifyCenter, Sparkles } from 'lucide-react'
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
  collageType: 'grid' | 'blend' | 'stitch'
  blendMode?: string
  stitchDirection?: 'vertical' | 'horizontal'
}

interface InshotMoodboardCreatorProps {
  open: boolean
  onClose: () => void
  onCreate: (options: InshotMoodboardOptions, selectedAssetIds: string[]) => Promise<void>
  assets: ProjectAsset[]
  isLoading?: boolean
}

// Collage types
const COLLAGE_TYPES = [
  { id: 'grid' as const, label: 'Grid', icon: Grid3X3, desc: 'Fixed cells — photos in separate tile slots', color: '#ff9f1c' },
  { id: 'blend' as const, label: 'Blend', icon: Layers, desc: 'AI merges photos with soft seamless edges', color: '#06d6a0' },
  { id: 'stitch' as const, label: 'Stitch', icon: AlignVerticalJustifyCenter, desc: 'Joins images end-to-end', color: '#3a86ff' },
]

// Grid layouts based on image count
const GRID_LAYOUTS = {
  1: [{ id: 'full', label: 'Full Frame', preview: '1' }],
  2: [
    { id: '2h', label: 'Side by Side', preview: '2h' },
    { id: '2v', label: 'Top / Bottom', preview: '2v' },
    { id: '2-big-left', label: 'Big Left', preview: '2bl' },
    { id: '2-big-right', label: 'Big Right', preview: '2br' },
  ],
  3: [
    { id: '3-top', label: '1 Top + 2 Bottom', preview: '3t' },
    { id: '3-bottom', label: '2 Top + 1 Bottom', preview: '3b' },
    { id: '3-left', label: '1 Left + 2 Right', preview: '3l' },
    { id: '3-right', label: '2 Left + 1 Right', preview: '3r' },
    { id: '3-row', label: 'Row', preview: '3row' },
    { id: '3-col', label: 'Column', preview: '3col' },
  ],
  4: [
    { id: '2x2', label: '2×2 Grid', preview: '2x2' },
    { id: '4-top', label: '1 Big Top', preview: '4t' },
    { id: '4-left', label: '1 Big Left', preview: '4l' },
    { id: '4-row', label: 'Row', preview: '4row' },
    { id: '4-col', label: 'Column', preview: '4col' },
    { id: '4-diagonal', label: 'Diagonal', preview: '4d' },
  ],
  5: [
    { id: '5-top2', label: '2 Top + 3 Bottom', preview: '5t2' },
    { id: '5-top3', label: '3 Top + 2 Bottom', preview: '5t3' },
    { id: '5-big', label: 'Big + 4 Small', preview: '5big' },
  ],
  6: [
    { id: '3x2', label: '3×2 Grid', preview: '3x2' },
    { id: '2x3', label: '2×3 Grid', preview: '2x3' },
    { id: '6-big', label: 'Big + 5 Small', preview: '6big' },
  ],
}

// Blend modes
const BLEND_MODES = [
  { id: 'normal', label: 'Normal' },
  { id: 'dissolve', label: 'Dissolve / Fade' },
  { id: 'luminosity', label: 'Luminosity' },
  { id: 'screen', label: 'Screen' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'overlay', label: 'Overlay' },
]

// Blend layouts
const BLEND_LAYOUTS = [
  { id: 'blend-2h', label: '2 Side by Side', maxImages: 2 },
  { id: 'blend-3', label: '3 Photo Blend', maxImages: 3 },
  { id: 'blend-free', label: 'Freeform', maxImages: 4 },
]

// Stitch directions
const STITCH_DIRECTIONS = [
  { id: 'vertical' as const, label: 'Vertical', desc: 'Images stacked top to bottom' },
  { id: 'horizontal' as const, label: 'Horizontal', desc: 'Images laid side by side' },
]

// Frame colors
const FRAME_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#1A1A1A', label: 'Black' },
  { value: '#F5F5F5', label: 'Light Gray' },
  { value: '#E8E4DF', label: 'Warm Gray' },
  { value: '#FFC0CB', label: 'Pink' },
  { value: '#FFE4B5', label: 'Moccasin' },
  { value: '#E6E6FA', label: 'Lavender' },
]

// Background options
const BACKGROUND_TYPES = [
  { id: 'solid', label: 'Solid Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'blur', label: 'Blurred Photo' },
]

// Gradient presets
const GRADIENT_PRESETS = [
  { id: 'sunset', colors: ['#ff7e5f', '#feb47b'], label: 'Sunset' },
  { id: 'ocean', colors: ['#2193b0', '#6dd5ed'], label: 'Ocean' },
  { id: 'forest', colors: ['#11998e', '#38ef7d'], label: 'Forest' },
  { id: 'lavender', colors: ['#ee9ca7', '#ffdde1'], label: 'Lavender' },
  { id: 'midnight', colors: ['#232526', '#414345'], label: 'Midnight' },
  { id: 'peach', colors: ['#ffecd2', '#fcb69f'], label: 'Peach' },
]

// Aspect ratios
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', desc: 'Square — Instagram', width: 1, height: 1 },
  { id: '9:16', label: '9:16', desc: 'TikTok / Reels / Stories', width: 9, height: 16 },
  { id: '16:9', label: '16:9', desc: 'YouTube / Landscape', width: 16, height: 9 },
  { id: '4:5', label: '4:5', desc: 'Instagram Feed', width: 4, height: 5 },
  { id: '3:4', label: '3:4', desc: 'Standard Portrait', width: 3, height: 4 },
  { id: '4:3', label: '4:3', desc: 'Standard Landscape', width: 4, height: 3 },
  { id: '2:1', label: '2:1', desc: 'Wide / Banner', width: 2, height: 1 },
]

type Step = 'select' | 'collageType' | 'aspectRatio' | 'layout' | 'customize'

export function InshotMoodboardCreator({
  open,
  onClose,
  onCreate,
  assets,
  isLoading,
}: InshotMoodboardCreatorProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [collageType, setCollageType] = useState<'grid' | 'blend' | 'stitch'>('grid')
  const [layout, setLayout] = useState('2x2')
  const [frameColor, setFrameColor] = useState('#FFFFFF')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [frameWidth, setFrameWidth] = useState(24)
  const [spacing, setSpacing] = useState(2)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [blendMode, setBlendMode] = useState('normal')
  const [stitchDirection, setStitchDirection] = useState<'vertical' | 'horizontal'>('vertical')
  const [backgroundType, setBackgroundType] = useState('solid')
  const [gradientPreset, setGradientPreset] = useState('sunset')
  const [step, setStep] = useState<Step>('select')

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

  // Get max images based on collage type
  const maxImages = useMemo(() => {
    if (collageType === 'stitch') return 20
    if (collageType === 'blend') return 4
    return 9 // Grid supports up to 9
  }, [collageType])

  // Get available layouts for current image count
  const availableLayouts = useMemo(() => {
    const count = selectedAssets.length
    if (count <= 1) return GRID_LAYOUTS[1]
    if (count === 2) return GRID_LAYOUTS[2]
    if (count === 3) return GRID_LAYOUTS[3]
    if (count === 4) return GRID_LAYOUTS[4]
    if (count === 5) return GRID_LAYOUTS[5]
    if (count >= 6) return GRID_LAYOUTS[6]
    return GRID_LAYOUTS[4]
  }, [selectedAssets.length])

  if (!open) return null

  const handleToggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId)
      }
      if (prev.length >= maxImages) {
        // Replace the oldest selection
        return [...prev.slice(1), assetId]
      }
      return [...prev, assetId]
    })
  }

  const handleCreate = async () => {
    const gradient = GRADIENT_PRESETS.find(g => g.id === gradientPreset)
    const bgColor = backgroundType === 'gradient' && gradient
      ? `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})`
      : frameColor

    await onCreate({
      backgroundColor: bgColor,
      gridLayout: collageType === 'stitch' ? `stitch-${stitchDirection}` : layout,
      borderEnabled: frameWidth > 0,
      borderColor: frameColor,
      borderRadius: cornerRadius,
      borderWidth: frameWidth,
      spacing,
      aspectRatio,
      frameWidth,
      collageType,
      blendMode: collageType === 'blend' ? blendMode : undefined,
      stitchDirection: collageType === 'stitch' ? stitchDirection : undefined,
    }, selectedAssets)
  }

  const handleContinue = () => {
    if (step === 'select' && selectedAssets.length >= 2) {
      setStep('collageType')
    } else if (step === 'collageType') {
      setStep('aspectRatio')
    } else if (step === 'aspectRatio') {
      if (collageType === 'grid') {
        setStep('layout')
      } else {
        setStep('customize')
      }
    } else if (step === 'layout') {
      setStep('customize')
    }
  }

  const handleBack = () => {
    if (step === 'customize') {
      setStep(collageType === 'grid' ? 'layout' : 'aspectRatio')
    } else if (step === 'layout') {
      setStep('aspectRatio')
    } else if (step === 'aspectRatio') {
      setStep('collageType')
    } else if (step === 'collageType') {
      setStep('select')
    }
  }

  // Get current aspect ratio dimensions
  const currentAspectRatio = ASPECT_RATIOS.find(ar => ar.id === aspectRatio) || ASPECT_RATIOS[0]

  // Get background style
  const getBackgroundStyle = () => {
    if (backgroundType === 'gradient') {
      const gradient = GRADIENT_PRESETS.find(g => g.id === gradientPreset)
      if (gradient) {
        return { background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})` }
      }
    }
    return { backgroundColor: frameColor }
  }

  const renderInshotPreview = () => {
    if (selectedAssetObjects.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
          Select photos
        </div>
      )
    }

    const images = selectedAssetObjects
    const count = images.length

    // Stitch preview
    if (collageType === 'stitch') {
      return (
        <div
          className="w-full h-full overflow-hidden"
          style={{ padding: `${frameWidth}px`, ...getBackgroundStyle() }}
        >
          <div className={`w-full h-full flex ${stitchDirection === 'vertical' ? 'flex-col' : 'flex-row'} gap-[${spacing}px]`}>
            {images.slice(0, 6).map((asset) => (
              <div key={asset.id} className="relative flex-1 overflow-hidden">
                <Image
                  src={asset.thumbnail_url || asset.url}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Blend preview
    if (collageType === 'blend') {
      const getBlendFilter = () => {
        switch (blendMode) {
          case 'screen': return 'brightness(1.2)'
          case 'multiply': return 'brightness(0.8) contrast(1.1)'
          case 'overlay': return 'contrast(1.2) saturate(1.1)'
          case 'luminosity': return 'grayscale(0.3) brightness(1.1)'
          case 'dissolve': return 'opacity(0.85)'
          default: return 'none'
        }
      }

      return (
        <div
          className="w-full h-full overflow-hidden relative"
          style={{ padding: `${frameWidth}px`, ...getBackgroundStyle() }}
        >
          <div className="relative w-full h-full">
            {images.slice(0, 3).map((asset, i) => (
              <div
                key={asset.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${i * 25}%`,
                  top: `${i * 15}%`,
                  width: '70%',
                  height: '70%',
                  zIndex: i,
                  filter: getBlendFilter(),
                  borderRadius: `${cornerRadius}px`,
                }}
              >
                <Image
                  src={asset.thumbnail_url || asset.url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{
                    maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Grid preview - render based on layout
    const renderGridLayout = () => {
      if (layout === 'full' || count === 1) {
        return (
          <div className="w-full h-full relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
            <Image
              src={images[0].thumbnail_url || images[0].url}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        )
      }

      if (layout === '2h') {
        return (
          <div className={`w-full h-full grid grid-cols-2 gap-[${spacing}px]`}>
            {images.slice(0, 2).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '2v') {
        return (
          <div className={`w-full h-full grid grid-rows-2 gap-[${spacing}px]`}>
            {images.slice(0, 2).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '3-top' || (count === 3 && layout === '2x2')) {
        return (
          <div className={`w-full h-full grid grid-rows-[60%_40%] gap-[${spacing}px]`}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className={`grid grid-cols-2 gap-[${spacing}px]`}>
              {images.slice(1, 3).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '3-bottom') {
        return (
          <div className={`w-full h-full grid grid-rows-[40%_60%] gap-[${spacing}px]`}>
            <div className={`grid grid-cols-2 gap-[${spacing}px]`}>
              {images.slice(0, 2).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[2]?.thumbnail_url || images[2]?.url || images[0].url} alt="" fill className="object-cover" />
            </div>
          </div>
        )
      }

      if (layout === '3-left') {
        return (
          <div className={`w-full h-full grid grid-cols-2 gap-[${spacing}px]`}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className={`grid grid-rows-2 gap-[${spacing}px]`}>
              {images.slice(1, 3).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '3-row') {
        return (
          <div className={`w-full h-full grid grid-cols-3 gap-[${spacing}px]`}>
            {images.slice(0, 3).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '3-col') {
        return (
          <div className={`w-full h-full grid grid-rows-3 gap-[${spacing}px]`}>
            {images.slice(0, 3).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '3-right') {
        return (
          <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacing}px` }}>
            <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
              {images.slice(0, 2).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[2]?.thumbnail_url || images[2]?.url || images[0].url} alt="" fill className="object-cover" />
            </div>
          </div>
        )
      }

      // 4-photo layouts
      if (layout === '4-top') {
        return (
          <div className="w-full h-full grid grid-rows-[65%_35%]" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
              {images.slice(1, 4).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '4-left') {
        return (
          <div className="w-full h-full grid grid-cols-[60%_40%]" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="grid grid-rows-3" style={{ gap: `${spacing}px` }}>
              {images.slice(1, 4).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '4-row') {
        return (
          <div className="w-full h-full grid grid-cols-4" style={{ gap: `${spacing}px` }}>
            {images.slice(0, 4).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '4-col') {
        return (
          <div className="w-full h-full grid grid-rows-4" style={{ gap: `${spacing}px` }}>
            {images.slice(0, 4).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '4-diagonal') {
        return (
          <div className="w-full h-full grid grid-cols-[65%_35%] grid-rows-[65%_35%]" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[1]?.thumbnail_url || images[1]?.url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[2]?.thumbnail_url || images[2]?.url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[3]?.thumbnail_url || images[3]?.url || images[0].url} alt="" fill className="object-cover" />
            </div>
          </div>
        )
      }

      // 5-photo layouts
      if (layout === '5-top2') {
        return (
          <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
              {images.slice(0, 2).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
              {images.slice(2, 5).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '5-top3') {
        return (
          <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacing}px` }}>
            <div className="grid grid-cols-3" style={{ gap: `${spacing}px` }}>
              {images.slice(0, 3).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2" style={{ gap: `${spacing}px` }}>
              {images.slice(3, 5).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (layout === '5-big') {
        return (
          <div className="w-full h-full grid grid-cols-[60%_40%]" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="grid grid-rows-4" style={{ gap: `${spacing}px` }}>
              {images.slice(1, 5).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      // 6-photo layouts
      if (layout === '3x2') {
        return (
          <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacing}px` }}>
            {images.slice(0, 6).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '2x3') {
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3" style={{ gap: `${spacing}px` }}>
            {images.slice(0, 6).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )
      }

      if (layout === '6-big') {
        return (
          <div className="w-full h-full grid grid-cols-[60%_40%] grid-rows-[65%_35%]" style={{ gap: `${spacing}px` }}>
            <div className="relative overflow-hidden row-span-1" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image src={images[0].thumbnail_url || images[0].url} alt="" fill className="object-cover" />
            </div>
            <div className="grid grid-rows-2" style={{ gap: `${spacing}px` }}>
              {images.slice(1, 3).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 col-span-2" style={{ gap: `${spacing}px` }}>
              {images.slice(3, 6).map((asset) => (
                <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                  <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      }

      // Default: 2x2 grid
      if (layout === '2x2') {
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacing}px` }}>
            {images.slice(0, 4).map((asset) => (
              <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
                <Image src={asset.thumbnail_url || asset.url} alt="" fill className="object-cover" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - count) }).map((_, i) => (
              <div key={`empty-${i}`} className="relative bg-white/10" style={{ borderRadius: `${cornerRadius}px` }} />
            ))}
          </div>
        )
      }

      // Fallback: 2x2 grid
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacing}px` }}>
          {images.slice(0, 4).map((asset) => (
            <div key={asset.id} className="relative overflow-hidden" style={{ borderRadius: `${cornerRadius}px` }}>
              <Image
                src={asset.thumbnail_url || asset.url}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: Math.max(0, 4 - count) }).map((_, i) => (
            <div key={`empty-${i}`} className="relative bg-white/10" style={{ borderRadius: `${cornerRadius}px` }} />
          ))}
        </div>
      )
    }

    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{ padding: `${frameWidth}px`, ...getBackgroundStyle() }}
      >
        {renderGridLayout()}
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
            <div className="text-white font-medium">Create InShot Collage</div>
            <div className="text-white/50 text-xs">Select 2-{maxImages} photos</div>
          </div>
          <button
            onClick={handleContinue}
            disabled={selectedAssets.length < 2}
            className="px-4 py-2 text-sm font-medium text-moodkin-dark bg-moodkin-gold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Selection indicator */}
        <div className="flex items-center justify-center gap-2 py-3 bg-white/5">
          <div className="text-white/60 text-sm mr-2">{selectedAssets.length} selected</div>
          {Array.from({ length: Math.min(6, maxImages) }).map((_, n) => (
            <div
              key={n}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                selectedAssets.length > n
                  ? 'bg-moodkin-gold text-moodkin-dark'
                  : 'bg-white/10 text-white/30'
              }`}
            >
              {n + 1}
            </div>
          ))}
          {maxImages > 6 && <span className="text-white/40 text-xs">+{maxImages - 6} more</span>}
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
              {imageAssets.map((asset) => {
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

  // Step 2: Collage Type Selection
  if (step === 'collageType') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={handleBack}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">Choose Collage Type</div>
            <div className="text-white/50 text-xs">{selectedAssets.length} photos selected</div>
          </div>
          <button
            onClick={handleContinue}
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
              width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(80%, 280px)' : 'auto',
              height: currentAspectRatio.height > currentAspectRatio.width ? 'min(80%, 380px)' : 'auto',
            }}
          >
            {renderInshotPreview()}
          </div>
        </div>

        {/* Collage Type Selector */}
        <div className="bg-[#2a2a2a] rounded-t-3xl">
          <div className="p-4 pb-8">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-3">Collage Type</div>
            <div className="space-y-3">
              {COLLAGE_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setCollageType(type.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      collageType === type.id
                        ? 'bg-white/15 ring-2'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    style={{
                      borderColor: collageType === type.id ? type.color : 'transparent',
                      ringColor: type.color,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${type.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: type.color }} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-white font-medium">{type.label}</div>
                      <div className="text-white/50 text-xs">{type.desc}</div>
                    </div>
                    {collageType === type.id && (
                      <Check className="w-5 h-5" style={{ color: type.color }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Aspect Ratio Selection
  if (step === 'aspectRatio') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={handleBack}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">Select Ratio</div>
            <div className="text-white/50 text-xs">Choose aspect ratio</div>
          </div>
          <button
            onClick={handleContinue}
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
              width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(80%, 280px)' : 'auto',
              height: currentAspectRatio.height > currentAspectRatio.width ? 'min(80%, 380px)' : 'auto',
            }}
          >
            {renderInshotPreview()}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="bg-[#2a2a2a] rounded-t-3xl">
          <div className="p-4 pb-8 max-h-[45vh] overflow-y-auto">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-3">Aspect Ratio</div>
            <div className="grid grid-cols-3 gap-3">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setAspectRatio(ar.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                    aspectRatio === ar.id
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {/* Visual representation */}
                  <div
                    className={`border-2 mb-2 ${
                      aspectRatio === ar.id ? 'border-moodkin-dark' : 'border-white/50'
                    }`}
                    style={{
                      width: `${Math.min(32, 32 * (ar.width / Math.max(ar.width, ar.height)))}px`,
                      height: `${Math.min(32, 32 * (ar.height / Math.max(ar.width, ar.height)))}px`,
                    }}
                  />
                  <span className="text-sm font-medium">{ar.label}</span>
                  <span className={`text-[10px] ${aspectRatio === ar.id ? 'text-moodkin-dark/70' : 'text-white/40'}`}>
                    {ar.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Layout Selection (Grid only)
  if (step === 'layout' && collageType === 'grid') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={handleBack}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">Choose Layout</div>
            <div className="text-white/50 text-xs">{selectedAssets.length} photos</div>
          </div>
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-sm font-medium text-moodkin-dark bg-moodkin-gold rounded-xl"
          >
            Next
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="rounded-xl overflow-hidden shadow-2xl relative"
            style={{
              aspectRatio: `${currentAspectRatio.width} / ${currentAspectRatio.height}`,
              width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(75%, 260px)' : 'auto',
              height: currentAspectRatio.height > currentAspectRatio.width ? 'min(70%, 350px)' : 'auto',
            }}
          >
            {renderInshotPreview()}
          </div>
        </div>

        {/* Layout Selector */}
        <div className="bg-[#2a2a2a] rounded-t-3xl">
          <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-3">Layout Templates</div>
            <div className="grid grid-cols-3 gap-2">
              {availableLayouts.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    layout === l.id
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <div className={`w-10 h-10 border-2 rounded mb-1 flex items-center justify-center text-xs ${
                    layout === l.id ? 'border-moodkin-dark' : 'border-white/40'
                  }`}>
                    <Grid3X3 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 5: Customize
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={handleBack}
          className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Customize Style</div>
          <div className="text-white/50 text-xs">{selectedAssets.length} photos • {collageType}</div>
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
            width: currentAspectRatio.width >= currentAspectRatio.height ? 'min(75%, 260px)' : 'auto',
            height: currentAspectRatio.height > currentAspectRatio.width ? 'min(70%, 350px)' : 'auto',
          }}
        >
          {renderInshotPreview()}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-[#2a2a2a] rounded-t-3xl">
        <div className="p-4 pb-4 max-h-[45vh] overflow-y-auto space-y-5">

          {/* Stitch Direction (for stitch mode) */}
          {collageType === 'stitch' && (
            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Stitch Direction</div>
              <div className="grid grid-cols-2 gap-2">
                {STITCH_DIRECTIONS.map((dir) => (
                  <button
                    key={dir.id}
                    onClick={() => setStitchDirection(dir.id)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      stitchDirection === dir.id
                        ? 'bg-[#3a86ff]/20 ring-2 ring-[#3a86ff]'
                        : 'bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <div className="text-white text-sm font-medium">{dir.label}</div>
                    <div className="text-white/50 text-xs">{dir.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blend Mode (for blend mode) */}
          {collageType === 'blend' && (
            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Blend Mode</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {BLEND_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setBlendMode(mode.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      blendMode === mode.id
                        ? 'bg-[#06d6a0]/20 text-[#06d6a0] ring-2 ring-[#06d6a0]'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background Type */}
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Background</div>
            <div className="flex gap-2">
              {BACKGROUND_TYPES.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBackgroundType(bg.id)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    backgroundType === bg.id
                      ? 'bg-moodkin-gold text-moodkin-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Solid Color Options */}
          {backgroundType === 'solid' && (
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
          )}

          {/* Gradient Options */}
          {backgroundType === 'gradient' && (
            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Gradient Preset</div>
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setGradientPreset(preset.id)}
                    className={`h-12 rounded-xl transition-all ${
                      gradientPreset === preset.id
                        ? 'ring-2 ring-moodkin-gold scale-105'
                        : 'hover:scale-102'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                    }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Border & Spacing */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Frame Width: {frameWidth}px</div>
              <input
                type="range"
                min="0"
                max="48"
                value={frameWidth}
                onChange={(e) => setFrameWidth(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Gap Between: {spacing}px</div>
              <input
                type="range"
                min="0"
                max="16"
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            <div className="space-y-2">
              <div className="text-white/60 text-xs uppercase tracking-wide">Corner Radius: {cornerRadius}px</div>
              <input
                type="range"
                min="0"
                max="32"
                value={cornerRadius}
                onChange={(e) => setCornerRadius(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="px-4 pb-6 pt-2 border-t border-white/10">
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
              `Create ${collageType.charAt(0).toUpperCase() + collageType.slice(1)} Collage`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
