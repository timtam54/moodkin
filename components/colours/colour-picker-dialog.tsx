'use client'

import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Pipette } from 'lucide-react'

interface ColourPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (colour: { hex_color: string; name?: string }) => Promise<void>
  existingColours?: string[]
}

// Preset colour palettes
const presetPalettes = {
  'Classic': ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
  'Warm': ['#FF6B6B', '#FFA07A', '#FFD93D', '#F4A460', '#CD853F', '#D2691E', '#8B4513', '#A0522D'],
  'Cool': ['#4ECDC4', '#45B7D1', '#96CEB4', '#88D8B0', '#5DADE2', '#3498DB', '#2980B9', '#1ABC9C'],
  'Pastel': ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FEC8D8', '#D4A5A5'],
  'Earth': ['#8B7355', '#A0522D', '#6B4423', '#8FBC8F', '#556B2F', '#808000', '#BDB76B', '#F5DEB3'],
  'Neutral': ['#F5F5F5', '#E8E8E8', '#D3D3D3', '#A9A9A9', '#808080', '#696969', '#505050', '#2F2F2F'],
}

export function ColourPickerDialog({ open, onClose, onSelect, existingColours = [] }: ColourPickerDialogProps) {
  const [selectedColour, setSelectedColour] = useState('#000000')
  const [colourName, setColourName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'picker' | 'palettes'>('palettes')

  const handleSubmit = async () => {
    if (!selectedColour) return
    setIsSubmitting(true)
    try {
      await onSelect({
        hex_color: selectedColour.toUpperCase(),
        name: colourName.trim() || undefined,
      })
      setSelectedColour('#000000')
      setColourName('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedColour('#000000')
      setColourName('')
      onClose()
    }
  }

  const isColourAlreadyAdded = (hex: string) => {
    return existingColours.some(c => c.toUpperCase() === hex.toUpperCase())
  }

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Colour</DialogTitle>
        <DialogDescription>
          Choose a colour from the palettes or use the colour picker
        </DialogDescription>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-moodkin-cream/50 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('palettes')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'palettes'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          Palettes
        </button>
        <button
          onClick={() => setActiveTab('picker')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'picker'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          <Pipette className="w-4 h-4" />
          Custom
        </button>
      </div>

      {activeTab === 'palettes' ? (
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {Object.entries(presetPalettes).map(([paletteName, colours]) => (
            <div key={paletteName}>
              <h4 className="text-xs font-semibold text-moodkin-gray uppercase tracking-wider mb-2">
                {paletteName}
              </h4>
              <div className="flex flex-wrap gap-2">
                {colours.map((hex) => {
                  const isAdded = isColourAlreadyAdded(hex)
                  const isSelected = selectedColour.toUpperCase() === hex.toUpperCase()
                  return (
                    <button
                      key={hex}
                      onClick={() => !isAdded && setSelectedColour(hex)}
                      disabled={isAdded}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-moodkin-gold scale-110 shadow-lg'
                          : isAdded
                            ? 'border-gray-200 opacity-40 cursor-not-allowed'
                            : 'border-transparent hover:scale-105 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={isAdded ? 'Already added' : hex}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Native colour picker */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="color"
                value={selectedColour}
                onChange={(e) => setSelectedColour(e.target.value)}
                className="w-20 h-20 rounded-xl cursor-pointer border-2 border-moodkin-light-gray"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-moodkin-dark mb-1">
                Hex Code
              </label>
              <Input
                type="text"
                value={selectedColour}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setSelectedColour(val)
                  }
                }}
                placeholder="#000000"
                className="font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected colour preview and name input */}
      <div className="mt-4 p-4 bg-moodkin-cream/30 rounded-xl">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl shadow-sm border border-black/10"
            style={{ backgroundColor: selectedColour }}
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-moodkin-dark mb-1">
              Colour Name (optional)
            </label>
            <Input
              type="text"
              value={colourName}
              onChange={(e) => setColourName(e.target.value)}
              placeholder="e.g., Sky Blue, Sunset Orange"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting || !selectedColour || isColourAlreadyAdded(selectedColour)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : isColourAlreadyAdded(selectedColour) ? (
            'Already Added'
          ) : (
            'Add Colour'
          )}
        </Button>
      </div>
    </Dialog>
  )
}
