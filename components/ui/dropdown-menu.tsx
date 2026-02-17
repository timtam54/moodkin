'use client'

import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const DropdownContext = createContext<{ close: () => void } | null>(null)

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
      <div className="relative" ref={menuRef}>
        <div onClick={() => setOpen(!open)}>
          {trigger}
        </div>
        {open && (
          <div
            className={cn(
              'absolute top-full mt-2 min-w-[180px] bg-white rounded-xl shadow-lg border border-moodkin-light-gray/50 py-2 z-50',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  )
}

interface DropdownMenuItemProps {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  destructive?: boolean
}

export function DropdownMenuItem({ onClick, children, className, destructive }: DropdownMenuItemProps) {
  const context = useContext(DropdownContext)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
        context?.close()
      }}
      className={cn(
        'w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-moodkin-dark hover:bg-moodkin-cream',
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-moodkin-light-gray/50" />
}
