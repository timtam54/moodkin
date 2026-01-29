'use client'

import { useCallback } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useCanvasStore } from '@/hooks/use-canvas-store'
import { deserializeCanvas } from '@/lib/canvas/serialize'
import type { Json } from '@/types/database'

interface TldrawCanvasProps {
  initialData?: Json | null
}

export function TldrawCanvas({ initialData }: TldrawCanvasProps) {
  const { setEditor, setDirty } = useCanvasStore()

  const handleMount = useCallback((editor: any) => {
    setEditor(editor)

    if (initialData) {
      const snapshot = deserializeCanvas(initialData)
      if (snapshot) {
        try {
          editor.store.loadStoreSnapshot(snapshot)
        } catch (e) {
          console.warn('Failed to load canvas snapshot:', e)
        }
      }
    }

    const unsub = editor.store.listen(() => {
      setDirty(true)
    }, { source: 'user', scope: 'document' })

    return () => unsub()
  }, [initialData, setEditor, setDirty])

  return (
    <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <Tldraw onMount={handleMount} />
    </div>
  )
}
