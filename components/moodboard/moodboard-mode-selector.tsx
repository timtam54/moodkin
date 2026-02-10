'use client'

import { Sparkles, Hand } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export type MoodboardMode = 'automatic' | 'manual'

interface MoodboardModeSelectorProps {
  open: boolean
  onClose: () => void
  onSelectMode: (mode: MoodboardMode) => void
}

export function MoodboardModeSelector({
  open,
  onClose,
  onSelectMode,
}: MoodboardModeSelectorProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create Moodboard</DialogTitle>
        <DialogDescription>
          Choose how you&apos;d like to create your moodboard
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 mt-2">
        <button
          onClick={() => onSelectMode('automatic')}
          className="flex items-start gap-4 p-4 rounded-xl border-2 border-moodkin-light-gray hover:border-moodkin-gold transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-moodkin-gold/20 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 text-moodkin-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-moodkin-dark">Automatic</h3>
            <p className="text-sm text-moodkin-gray mt-1">
              AI creates your moodboard using the most liked images, displayed larger and at the top
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('manual')}
          className="flex items-start gap-4 p-4 rounded-xl border-2 border-moodkin-light-gray hover:border-moodkin-gold transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Hand className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-moodkin-dark">Manual</h3>
            <p className="text-sm text-moodkin-gray mt-1">
              Choose your photos, pick a layout, and customize borders &amp; colors
            </p>
          </div>
        </button>
      </div>
    </Dialog>
  )
}
