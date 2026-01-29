'use client'

import { useState } from 'react'
import { Camera, Briefcase } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import type { CreativeClientType } from '@/types/database'

interface UserTypeSelectorProps {
  onSelect: (type: CreativeClientType) => Promise<void>
}

export function UserTypeSelector({ onSelect }: UserTypeSelectorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedType, setSelectedType] = useState<CreativeClientType | null>(null)

  const handleSelect = async (type: CreativeClientType) => {
    setSelectedType(type)
    setIsSubmitting(true)
    try {
      await onSelect(type)
    } catch (error) {
      console.error('Failed to save user type:', error)
      setIsSubmitting(false)
      setSelectedType(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-moodkin-cream overflow-auto py-8">
      <div className="w-full max-w-md mx-4 flex flex-col items-center">
        {/* Logo */}
        <Logo size="lg" showUnderline className="mb-8" />

        {/* Subtitle */}
        <p className="text-xl italic text-moodkin-gray mb-8">Choose your journey</p>

        {/* Creative Option */}
        <button
          onClick={() => handleSelect('creative')}
          disabled={isSubmitting}
          className="w-full mb-4 rounded-xl overflow-hidden shadow-lg bg-white transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-lg"
        >
          <div className="h-48 bg-moodkin-dark relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80"
              alt="Creative professional"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-lg font-bold tracking-wider text-moodkin-dark">
                I AM A CREATIVE
              </h2>
              <p className="text-sm text-moodkin-gray">
                Photographers, stylists, and designers
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-moodkin-gold flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          {isSubmitting && selectedType === 'creative' && (
            <div className="px-4 pb-4">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-moodkin-gold animate-pulse w-full" />
              </div>
            </div>
          )}
        </button>

        {/* Client Option */}
        <button
          onClick={() => handleSelect('client')}
          disabled={isSubmitting}
          className="w-full rounded-xl overflow-hidden shadow-lg bg-white transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-lg"
        >
          <div className="h-48 bg-gray-100 relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80"
              alt="Client workspace"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4 bg-moodkin-gold flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-wider text-moodkin-dark">
              I AM A CLIENT
            </h2>
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-moodkin-dark" />
            </div>
          </div>
          {isSubmitting && selectedType === 'client' && (
            <div className="px-4 pb-4 bg-moodkin-gold">
              <div className="h-1 bg-moodkin-gold-hover rounded-full overflow-hidden">
                <div className="h-full bg-white animate-pulse w-full" />
              </div>
            </div>
          )}
        </button>

        <a
          href="/dashboard"
          className="mt-8 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-8 py-3 transition-colors"
        >
          Next
        </a>
      </div>
    </div>
  )
}
