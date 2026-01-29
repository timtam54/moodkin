'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showUnderline?: boolean
}

const imageSizes = {
  sm: { width: 120, height: 32 },
  md: { width: 180, height: 48 },
  lg: { width: 240, height: 64 },
  xl: { width: 320, height: 85 },
}

export function Logo({ className, size = 'md', showUnderline = false }: LogoProps) {
  const { width, height } = imageSizes[size]

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Image
        src="/logo.png"
        alt="Moodkin"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showUnderline && (
        <div className="w-12 h-1 bg-moodkin-gold mt-2 rounded-full" />
      )}
    </div>
  )
}

export function LogoText({ className, size = 'md' }: Omit<LogoProps, 'showUnderline'>) {
  const { width, height } = imageSizes[size]

  return (
    <Image
      src="/logo.png"
      alt="Moodkin"
      width={width}
      height={height}
      className={cn('object-contain', className)}
      priority
    />
  )
}
