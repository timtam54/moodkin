'use client'

import { useState } from 'react'
import { X, HelpCircle, Monitor, Smartphone } from 'lucide-react'

interface FreeformHelpDialogProps {
  open: boolean
  onClose: () => void
}

type DeviceType = 'desktop' | 'mobile'

interface HelpAction {
  id: string
  title: string
  description: string
  desktopAnimation: React.ReactNode
  mobileAnimation: React.ReactNode
}

const HELP_ACTIONS: HelpAction[] = [
  {
    id: 'move',
    title: 'Move',
    description: 'Reposition images on the canvas',
    desktopAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden">
        {/* Static image placeholder */}
        <div className="absolute w-16 h-16 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded animate-move-desktop">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
        </div>
        {/* Cursor */}
        <div className="absolute animate-cursor-move-desktop">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
          </svg>
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Click and drag</p>
      </div>
    ),
    mobileAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden">
        {/* Static image placeholder */}
        <div className="absolute w-16 h-16 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded animate-move-mobile">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
        </div>
        {/* Finger touch indicator */}
        <div className="absolute animate-finger-move-mobile">
          <div className="w-8 h-8 rounded-full bg-black/20 border-2 border-black/30" />
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Touch and drag</p>
      </div>
    ),
  },
  {
    id: 'resize',
    title: 'Resize',
    description: 'Change the size of images',
    desktopAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Resizing image */}
        <div className="relative animate-resize-desktop bg-moodkin-gold/30 border-2 border-moodkin-gold rounded">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-moodkin-gold rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-moodkin-gold rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-moodkin-gold rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-moodkin-gold rounded-full animate-pulse" />
        </div>
        {/* Cursor on corner */}
        <div className="absolute animate-cursor-resize-desktop">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md rotate-45">
            <path d="M12 4L12 20M12 4L8 8M12 4L16 8M12 20L8 16M12 20L16 16" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Drag corner handles</p>
      </div>
    ),
    mobileAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Resizing image */}
        <div className="relative animate-resize-mobile bg-moodkin-gold/30 border-2 border-moodkin-gold rounded">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
          {/* Corner handles - larger for mobile */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-moodkin-gold rounded-full" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-moodkin-gold rounded-full" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-moodkin-gold rounded-full" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-moodkin-gold rounded-full animate-pulse" />
        </div>
        {/* Finger on corner */}
        <div className="absolute animate-finger-resize-mobile">
          <div className="w-8 h-8 rounded-full bg-black/20 border-2 border-black/30" />
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Touch and drag corners</p>
      </div>
    ),
  },
  {
    id: 'rotate',
    title: 'Rotate',
    description: 'Rotate images using the controls',
    desktopAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Rotating image */}
        <div className="w-16 h-16 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded animate-rotate-demo">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
        </div>
        {/* Rotate button indicator */}
        <div className="absolute bottom-8 right-8 flex items-center gap-1 bg-white rounded-lg px-2 py-1 shadow-sm animate-pulse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-moodkin-dark">
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Click rotate buttons</p>
      </div>
    ),
    mobileAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Rotating image */}
        <div className="w-16 h-16 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded animate-rotate-demo">
          <div className="w-full h-full bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40" />
        </div>
        {/* Rotate button indicator */}
        <div className="absolute bottom-8 right-8 flex items-center gap-1 bg-white rounded-lg px-2 py-1 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-moodkin-dark">
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </div>
        {/* Finger tap */}
        <div className="absolute bottom-6 right-6 animate-finger-tap">
          <div className="w-8 h-8 rounded-full bg-black/20 border-2 border-black/30" />
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Tap rotate buttons</p>
      </div>
    ),
  },
  {
    id: 'layer',
    title: 'Send to Back / Bring to Front',
    description: 'Change the layering order of images',
    desktopAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Stacked images */}
        <div className="relative">
          <div className="absolute w-14 h-14 bg-blue-200 border-2 border-blue-400 rounded left-0 top-0" />
          <div className="w-14 h-14 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded ml-4 mt-4 animate-layer-demo" />
        </div>
        {/* Layer buttons */}
        <div className="absolute bottom-8 right-6 flex gap-1">
          <div className="bg-white rounded p-1 shadow-sm animate-pulse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </div>
          <div className="bg-white rounded p-1 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Use layer buttons</p>
      </div>
    ),
    mobileAnimation: (
      <div className="relative w-full h-32 bg-moodkin-cream/50 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Stacked images */}
        <div className="relative">
          <div className="absolute w-14 h-14 bg-blue-200 border-2 border-blue-400 rounded left-0 top-0" />
          <div className="w-14 h-14 bg-moodkin-gold/30 border-2 border-moodkin-gold rounded ml-4 mt-4 animate-layer-demo" />
        </div>
        {/* Layer buttons */}
        <div className="absolute bottom-8 right-6 flex gap-1">
          <div className="bg-white rounded p-1 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </div>
          <div className="bg-white rounded p-1 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </div>
        {/* Finger tap */}
        <div className="absolute bottom-6 right-8 animate-finger-tap">
          <div className="w-8 h-8 rounded-full bg-black/20 border-2 border-black/30" />
        </div>
        <p className="absolute bottom-2 left-2 text-xs text-moodkin-gray">Tap layer buttons</p>
      </div>
    ),
  },
]

export function FreeformHelpDialog({ open, onClose }: FreeformHelpDialogProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-moodkin-light-gray/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-moodkin-gold/20 rounded-full flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-moodkin-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-moodkin-dark">How to Use</h2>
              <p className="text-sm text-moodkin-gray">Canvas controls guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-moodkin-cream transition-colors"
          >
            <X className="w-5 h-5 text-moodkin-gray" />
          </button>
        </div>

        {/* Device Toggle */}
        <div className="flex items-center justify-center gap-2 p-3 border-b border-moodkin-light-gray/30 bg-moodkin-cream/30">
          <button
            onClick={() => setDeviceType('desktop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              deviceType === 'desktop'
                ? 'bg-moodkin-gold text-moodkin-dark'
                : 'bg-white text-moodkin-gray hover:bg-moodkin-cream'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </button>
          <button
            onClick={() => setDeviceType('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              deviceType === 'mobile'
                ? 'bg-moodkin-gold text-moodkin-dark'
                : 'bg-white text-moodkin-gray hover:bg-moodkin-cream'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {HELP_ACTIONS.map(action => (
            <div key={action.id} className="bg-moodkin-cream/30 rounded-xl p-4">
              <h3 className="font-semibold text-moodkin-dark mb-1">{action.title}</h3>
              <p className="text-sm text-moodkin-gray mb-3">{action.description}</p>
              {deviceType === 'desktop' ? action.desktopAnimation : action.mobileAnimation}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-moodkin-light-gray/30 bg-moodkin-cream/30">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-moodkin-gold hover:bg-moodkin-gold/90 text-moodkin-dark font-medium rounded-xl transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes move-desktop {
          0%, 100% { left: 20px; top: 20px; }
          50% { left: 80px; top: 50px; }
        }
        @keyframes cursor-move-desktop {
          0%, 100% { left: 28px; top: 28px; }
          50% { left: 88px; top: 58px; }
        }
        @keyframes move-mobile {
          0%, 100% { left: 20px; top: 20px; }
          50% { left: 80px; top: 50px; }
        }
        @keyframes finger-move-mobile {
          0%, 100% { left: 32px; top: 32px; }
          50% { left: 92px; top: 62px; }
        }
        @keyframes resize-desktop {
          0%, 100% { width: 48px; height: 48px; }
          50% { width: 80px; height: 80px; }
        }
        @keyframes cursor-resize-desktop {
          0%, 100% { right: 45%; bottom: 30%; }
          50% { right: 25%; bottom: 10%; }
        }
        @keyframes resize-mobile {
          0%, 100% { width: 48px; height: 48px; }
          50% { width: 72px; height: 72px; }
        }
        @keyframes finger-resize-mobile {
          0%, 100% { right: 40%; bottom: 25%; }
          50% { right: 25%; bottom: 10%; }
        }
        @keyframes rotate-demo {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes finger-tap {
          0%, 40%, 100% { opacity: 0; transform: scale(0.8); }
          50%, 90% { opacity: 1; transform: scale(1); }
        }
        @keyframes layer-demo {
          0%, 40%, 100% { z-index: 1; }
          50%, 90% { z-index: 10; }
        }

        :global(.animate-move-desktop) {
          animation: move-desktop 3s ease-in-out infinite;
        }
        :global(.animate-cursor-move-desktop) {
          animation: cursor-move-desktop 3s ease-in-out infinite;
        }
        :global(.animate-move-mobile) {
          animation: move-mobile 3s ease-in-out infinite;
        }
        :global(.animate-finger-move-mobile) {
          animation: finger-move-mobile 3s ease-in-out infinite;
        }
        :global(.animate-resize-desktop) {
          animation: resize-desktop 2.5s ease-in-out infinite;
        }
        :global(.animate-cursor-resize-desktop) {
          animation: cursor-resize-desktop 2.5s ease-in-out infinite;
        }
        :global(.animate-resize-mobile) {
          animation: resize-mobile 2.5s ease-in-out infinite;
        }
        :global(.animate-finger-resize-mobile) {
          animation: finger-resize-mobile 2.5s ease-in-out infinite;
        }
        :global(.animate-rotate-demo) {
          animation: rotate-demo 2s ease-in-out infinite;
        }
        :global(.animate-finger-tap) {
          animation: finger-tap 2s ease-in-out infinite;
        }
        :global(.animate-layer-demo) {
          animation: layer-demo 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
