'use client'

import { Loader2 } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          disabled={isLoading}
          className="flex-1"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'default'}
          onClick={(e) => {
            e.stopPropagation()
            onConfirm()
          }}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
