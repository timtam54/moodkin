'use client'

import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCanvasStore } from '@/hooks/use-canvas-store'
import { serializeCanvas } from '@/lib/canvas/serialize'

interface CanvasToolbarProps {
  onSave: (data: unknown) => Promise<void>
}

export function CanvasToolbar({ onSave }: CanvasToolbarProps) {
  const { editor, isDirty, isSaving, setSaving, setDirty } = useCanvasStore()

  async function handleSave() {
    if (!editor || isSaving) return
    setSaving(true)
    try {
      const snapshot = editor.store.getStoreSnapshot()
      const serialized = serializeCanvas(snapshot)
      await onSave(serialized)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 rounded-b-lg">
      <div className="text-xs text-gray-500">
        {isDirty ? 'Unsaved changes' : 'All changes saved'}
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={!isDirty || isSaving}
      >
        <Save className="w-3 h-3 mr-1" />
        {isSaving ? 'Saving...' : 'Save Canvas'}
      </Button>
    </div>
  )
}
