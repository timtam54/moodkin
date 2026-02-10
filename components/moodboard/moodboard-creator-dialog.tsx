'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MoodboardOptions {
  backgroundColor: string
  gridLayout: string
  borderEnabled: boolean
  borderColor: string
  borderRadius: number
  borderWidth: number
  spacing: number
}

interface MoodboardCreatorDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (options: MoodboardOptions) => Promise<void>
  imageCount: number
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

const BORDER_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#F5F5F0', label: 'Cream' },
  { value: '#D4AF37', label: 'Gold' },
  { value: '#C0C0C0', label: 'Silver' },
]

// Layout templates - visual grid patterns like in the reference images
const LAYOUT_TEMPLATES = [
  { value: '2x2', label: '2×2 Grid', icon: '⊞', cols: 2, rows: 2 },
  { value: '1+2', label: '1 Large + 2', icon: '⊟', cols: 2, rows: 2, featured: true },
  { value: '2+1', label: '2 + 1 Large', icon: '⊡', cols: 2, rows: 2, featuredBottom: true },
  { value: '1+3', label: '1 Large + 3', icon: '⊠', cols: 2, rows: 2, featured: true },
  { value: '3x2', label: '3×2 Grid', icon: '⊞', cols: 3, rows: 2 },
  { value: '2x3', label: '2×3 Grid', icon: '⊞', cols: 2, rows: 3 },
  { value: '3x3', label: '3×3 Grid', icon: '⊞', cols: 3, rows: 3 },
  { value: '4x2', label: '4×2 Grid', icon: '⊞', cols: 4, rows: 2 },
  { value: 'auto', label: 'Auto', icon: '✨', cols: 0, rows: 0 },
]

type TabType = 'gallery' | 'layout' | 'border'

export function MoodboardCreatorDialog({
  open,
  onClose,
  onCreate,
  imageCount,
  isLoading,
}: MoodboardCreatorDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('gallery')
  const [backgroundColor, setBackgroundColor] = useState('#1A1A1A')
  const [gridLayout, setGridLayout] = useState('2x2')
  const [borderEnabled, setBorderEnabled] = useState(true)
  const [borderColor, setBorderColor] = useState('#FFFFFF')
  const [borderRadius, setBorderRadius] = useState(12)
  const [borderWidth, setBorderWidth] = useState(0)
  const [spacing, setSpacing] = useState(8)

  if (!open) return null

  const handleCreate = async () => {
    await onCreate({
      backgroundColor,
      gridLayout,
      borderEnabled,
      borderColor,
      borderRadius,
      borderWidth,
      spacing,
    })
  }

  // Get preview grid dimensions
  const getPreviewGrid = () => {
    const layout = LAYOUT_TEMPLATES.find(l => l.value === gridLayout) || LAYOUT_TEMPLATES[0]
    if (layout.value === 'auto') {
      return { cols: 2, rows: 2, featured: false }
    }
    return { cols: layout.cols, rows: layout.rows, featured: layout.featured, featuredBottom: layout.featuredBottom }
  }

  const previewGrid = getPreviewGrid()

  // Render layout icon preview
  const renderLayoutIcon = (layout: typeof LAYOUT_TEMPLATES[0]) => {
    const cols = layout.cols || 2
    const rows = layout.rows || 2
    const isFeatured = layout.featured
    const isFeaturedBottom = layout.featuredBottom

    if (layout.value === 'auto') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-lg">✨</span>
        </div>
      )
    }

    if (isFeatured) {
      // 1 large on left, smaller on right
      return (
        <div className="w-full h-full grid grid-cols-2 gap-0.5">
          <div className="bg-current rounded-sm row-span-2" />
          <div className="grid grid-rows-2 gap-0.5">
            <div className="bg-current rounded-sm" />
            <div className="bg-current rounded-sm" />
          </div>
        </div>
      )
    }

    if (isFeaturedBottom) {
      // Smaller on top, 1 large on bottom
      return (
        <div className="w-full h-full grid grid-rows-2 gap-0.5">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="bg-current rounded-sm" />
            <div className="bg-current rounded-sm" />
          </div>
          <div className="bg-current rounded-sm" />
        </div>
      )
    }

    // Regular grid
    return (
      <div
        className="w-full h-full grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div key={i} className="bg-current rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Dark background matching the reference */}
      <div className="absolute inset-0 bg-[#1a1a1a]" />

      {/* Preview Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 pt-16">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
          disabled={isLoading}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Moodboard Preview */}
        <div
          className="w-full max-w-md aspect-square rounded-2xl overflow-hidden"
          style={{ backgroundColor }}
        >
          <div
            className="w-full h-full grid"
            style={{
              gap: `${spacing}px`,
              padding: `${spacing}px`,
              gridTemplateColumns: previewGrid.featured
                ? '1fr 1fr'
                : `repeat(${previewGrid.cols}, 1fr)`,
              gridTemplateRows: previewGrid.featuredBottom
                ? '1fr 1fr'
                : `repeat(${previewGrid.rows}, 1fr)`,
            }}
          >
            {previewGrid.featured ? (
              // Featured layout: 1 large on left
              <>
                <div
                  className="row-span-2 bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
                <div
                  className="bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
                <div
                  className="bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
              </>
            ) : previewGrid.featuredBottom ? (
              // Featured bottom layout
              <>
                <div
                  className="bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
                <div
                  className="bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
                <div
                  className="col-span-2 bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
              </>
            ) : (
              // Regular grid
              Array.from({ length: Math.min(previewGrid.cols * previewGrid.rows, imageCount || 4) }).map((_, i) => (
                <div
                  key={i}
                  className="bg-moodkin-gray/40"
                  style={{
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="relative bg-[#2a2a2a] rounded-t-3xl">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-8 py-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'gallery' ? 'text-white' : 'text-white/50'
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`text-sm font-medium transition-colors relative ${
              activeTab === 'layout' ? 'text-white' : 'text-white/50'
            }`}
          >
            Layout
            {activeTab === 'layout' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('border')}
            className={`text-sm font-medium transition-colors relative ${
              activeTab === 'border' ? 'text-white' : 'text-white/50'
            }`}
          >
            Border
            {activeTab === 'border' && (
              <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || imageCount === 0}
            className="ml-4 text-white/80 hover:text-white disabled:text-white/30"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto">
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <p className="text-white/70 text-sm text-center">
                Background Color
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setBackgroundColor(color.value)}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      backgroundColor === color.value
                        ? 'border-white scale-110'
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {backgroundColor === color.value && (
                      <Check className={`w-5 h-5 mx-auto ${
                        color.value === '#1A1A1A' || color.value === '#2C3E50' ? 'text-white' : 'text-moodkin-dark'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="grid grid-cols-4 gap-3">
              {LAYOUT_TEMPLATES.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setGridLayout(layout.value)}
                  className={`aspect-square p-2 rounded-xl border-2 transition-all ${
                    gridLayout === layout.value
                      ? 'border-white bg-white/10'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="w-full h-full text-white/60">
                    {renderLayoutIcon(layout)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'border' && (
            <div className="space-y-6">
              {/* Spacing Slider */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center text-white/60">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="7" width="6" height="2" />
                      <rect x="9" y="7" width="6" height="2" />
                      <rect x="7" y="1" width="2" height="6" />
                      <rect x="7" y="9" width="2" height="6" />
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

              {/* Border Width Slider */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center text-white/60">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12 A 8 8 0 0 1 12 4" />
                    </svg>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>

              {/* Border Color */}
              {borderWidth > 0 && (
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {BORDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBorderColor(color.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        borderColor === color.value
                          ? 'border-white scale-110'
                          : 'border-transparent hover:border-white/30'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {borderColor === color.value && (
                        <Check className={`w-4 h-4 mx-auto ${
                          color.value === '#000000' ? 'text-white' : 'text-moodkin-dark'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="px-4 pb-6">
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || imageCount === 0}
            className="w-full py-3 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create Moodboard (${imageCount} images)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
