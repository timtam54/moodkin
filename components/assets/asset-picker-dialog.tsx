'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectAsset } from '@/types/database'

interface AssetPickerDialogProps {
  open: boolean
  onClose: () => void
  assets: ProjectAsset[]
  onSelect: (assetIds: string[]) => Promise<void>
  isLoading?: boolean
}

export function AssetPickerDialog({
  open,
  onClose,
  assets,
  onSelect,
  isLoading,
}: AssetPickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  if (!open) return null

  // Filter to only show images where creative is not true
  const availableAssets = assets.filter(
    (a) => a.asset_type === 'image' && !a.creative
  )

  const toggleSelection = (assetId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedIds(newSelected)
  }

  const handleSubmit = async () => {
    await onSelect(Array.from(selectedIds))
    setSelectedIds(new Set())
    onClose()
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-moodkin-light-gray">
          <div>
            <h2 className="text-lg font-bold text-moodkin-dark">
              Select Images for Creative
            </h2>
            <p className="text-sm text-moodkin-gray">
              {availableAssets.length} available • {selectedIds.size} selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-moodkin-cream rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-moodkin-dark" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {availableAssets.length === 0 ? (
            <div className="text-center py-12 text-moodkin-gray">
              <p>No images available to select</p>
              <p className="text-sm mt-1">Upload images in the Uploads tab first</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {availableAssets.map((asset) => {
                const isSelected = selectedIds.has(asset.id)
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleSelection(asset.id)}
                    className={`aspect-square relative rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? 'ring-4 ring-moodkin-gold ring-offset-2'
                        : 'hover:ring-2 hover:ring-moodkin-light-gray'
                    }`}
                  >
                    <Image
                      src={asset.url}
                      alt={asset.filename}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-moodkin-gold/30 flex items-center justify-center">
                        <div className="w-8 h-8 bg-moodkin-gold rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-moodkin-dark" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-moodkin-light-gray">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedIds.size} Image${selectedIds.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
