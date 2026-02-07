'use client'

import { cn } from '@/lib/utils'

interface LoadingProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Loading({ message = 'Loading...', className, size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className={cn('animate-spin', sizeClasses[size])}>
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Infinity symbol styled like the moodkin logo */}
          <path
            d="M25 25 C25 10, 45 10, 50 25 C55 40, 75 40, 75 25 C75 10, 55 10, 50 25 C45 40, 25 40, 25 25"
            fill="none"
            stroke="#F5C547"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {message && (
        <p className={cn('mt-3 text-moodkin-gray', textSizeClasses[size])}>{message}</p>
      )}
    </div>
  )
}

// Hook for consistent loading state usage
export function useLoading(isLoading: boolean, message?: string) {
  return {
    isLoading,
    loadingElement: isLoading ? <Loading message={message} /> : null,
  }
}
