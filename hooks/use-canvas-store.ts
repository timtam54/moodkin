import { create } from 'zustand'

interface CanvasStore {
  editor: any | null
  isDirty: boolean
  isSaving: boolean
  setEditor: (editor: any | null) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  editor: null,
  isDirty: false,
  isSaving: false,
  setEditor: (editor) => set({ editor }),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
}))
