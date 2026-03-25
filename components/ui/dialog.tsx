'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="fixed inset-0 bg-black/50 z-0" />
      <div
        className={cn(
          'relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-moodkin-gray hover:text-moodkin-dark transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 pr-8">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-moodkin-dark tracking-wide">
      {children}
    </h2>
  )
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-moodkin-gray mt-1">{children}</p>
}
