'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Camera, Users, Palette, Sparkles, Check, FolderOpen, Heart, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/hooks/use-onboarding'
import { Button } from '@/components/ui/button'

interface StepContent {
  id: string
  title: string
  subtitle?: string
  description: string
  icon: React.ReactNode
  mockup?: 'projects' | 'collaborate' | 'moodboard' | 'ai' | 'ready'
}

const steps: StepContent[] = [
  {
    id: 'welcome',
    title: 'Welcome to Moodkin',
    subtitle: 'Visual collaboration for creatives',
    description: 'Moodkin helps photographers, stylists, and designers collaborate with their clients through beautiful visual moodboards. Share ideas, gather inspiration, and align on creative vision—all in one place.',
    icon: <Camera className="w-8 h-8" />,
    mockup: 'projects',
  },
  {
    id: 'invite',
    title: 'Invite & Collaborate',
    subtitle: 'Work together seamlessly',
    description: 'Invite clients and team members to your projects with a simple link. Everyone can add images, share links, and react to ideas in real-time.',
    icon: <Users className="w-8 h-8" />,
    mockup: 'collaborate',
  },
  {
    id: 'moodboards',
    title: 'Create Moodboards',
    subtitle: 'Bring ideas to life',
    description: 'Build stunning moodboards with your collected inspiration. Drag, arrange, and export your vision as beautiful shareable images.',
    icon: <Palette className="w-8 h-8" />,
    mockup: 'moodboard',
  },
  {
    id: 'ai',
    title: 'AI-Powered Tools',
    subtitle: 'Enhance your workflow',
    description: 'Generate images with AI, extract color palettes automatically, and get smart suggestions to help understand your client\'s vision better.',
    icon: <Sparkles className="w-8 h-8" />,
    mockup: 'ai',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    subtitle: 'Start creating',
    description: 'Create your first project and invite a client to begin collaborating. Your creative journey starts now.',
    icon: <Check className="w-8 h-8" />,
    mockup: 'ready',
  },
]

// Mockup components for each step
function ProjectsMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-moodkin-dark px-4 py-3 flex items-center gap-2">
          <div className="text-white text-xs tracking-widest">MOODKIN</div>
        </div>
        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="text-sm font-semibold text-moodkin-dark">Projects</div>
          {/* Project cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-moodkin-gold rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-moodkin-dark" />
            </div>
            <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl" />
            <div className="aspect-square bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl" />
            <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CollaborateMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="text-sm font-semibold text-moodkin-dark">Team Members</div>
          {/* User avatars */}
          <div className="space-y-3">
            {['Sarah M.', 'Client', 'Alex K.'].map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium",
                  i === 0 ? "bg-moodkin-gold text-moodkin-dark" : i === 1 ? "bg-blue-500" : "bg-purple-500"
                )}>
                  {name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-moodkin-dark">{name}</div>
                  <div className="text-xs text-moodkin-gray">{i === 0 ? 'Owner' : i === 1 ? 'Client' : 'Collaborator'}</div>
                </div>
                {i === 1 && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
              </div>
            ))}
          </div>
          {/* Invite button */}
          <button className="w-full py-2 bg-moodkin-gold text-moodkin-dark text-sm font-medium rounded-xl">
            + Invite Client
          </button>
        </div>
      </div>
    </div>
  )
}

function MoodboardMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-3">
          {/* Moodboard grid */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="col-span-2 row-span-2 aspect-square bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg" />
            <div className="aspect-square bg-gradient-to-br from-rose-200 to-pink-300 rounded-lg" />
            <div className="aspect-square bg-gradient-to-br from-sky-200 to-blue-300 rounded-lg" />
            <div className="aspect-square bg-gradient-to-br from-emerald-200 to-green-300 rounded-lg" />
            <div className="aspect-square bg-gradient-to-br from-violet-200 to-purple-300 rounded-lg" />
            <div className="aspect-square bg-gradient-to-br from-amber-100 to-yellow-200 rounded-lg" />
          </div>
          {/* Color palette */}
          <div className="mt-3 flex gap-1">
            {['#D4A574', '#E8B4B8', '#A8D5E5', '#B8D4BE', '#C9B8E8'].map((color) => (
              <div key={color} className="flex-1 h-6 rounded-md" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AIMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-moodkin-gold" />
            <span className="text-sm font-semibold text-moodkin-dark">AI Generate</span>
          </div>
          {/* Prompt input */}
          <div className="bg-moodkin-cream rounded-xl p-3 text-xs text-moodkin-gray">
            "Moody autumn wedding, warm tones, candlelit..."
          </div>
          {/* Generated images */}
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-gradient-to-br from-amber-300 to-orange-400 rounded-xl relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white/80" />
              </div>
            </div>
            <div className="aspect-square bg-gradient-to-br from-rose-300 to-red-400 rounded-xl" />
          </div>
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] bg-moodkin-gold/20 text-moodkin-dark px-2 py-1 rounded-full">Warm tones</span>
            <span className="text-[10px] bg-moodkin-gold/20 text-moodkin-dark px-2 py-1 rounded-full">Romantic</span>
            <span className="text-[10px] bg-moodkin-gold/20 text-moodkin-dark px-2 py-1 rounded-full">Outdoor</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReadyMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="relative">
        {/* Celebration effect */}
        <div className="absolute inset-0 -m-8">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-moodkin-gold rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/4 right-0 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="absolute bottom-1/4 left-0 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          <div className="absolute bottom-0 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
        </div>
        {/* Check icon */}
        <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center shadow-xl">
          <Check className="w-16 h-16 text-white" strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

const mockupComponents: Record<string, React.FC> = {
  projects: ProjectsMockup,
  collaborate: CollaborateMockup,
  moodboard: MoodboardMockup,
  ai: AIMockup,
  ready: ReadyMockup,
}

export function OnboardingTour() {
  const [isMounted, setIsMounted] = useState(false)
  const {
    isOnboardingActive,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render on server
  if (!isMounted) return null

  // Don't render if onboarding is not active
  if (!isOnboardingActive) return null

  const currentStep = steps[currentStepIndex] || steps[0]
  const MockupComponent = currentStep.mockup ? mockupComponents[currentStep.mockup] : null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 md:p-8"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Main Card - 90% of viewport */}
      <div
        className="relative bg-moodkin-cream rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden"
        style={{ height: '90vh', maxHeight: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-moodkin-light-gray/50 z-10">
          <div
            className="h-full bg-moodkin-gold transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="h-full flex flex-col md:flex-row">
          {/* Left side - Mockup (narrower, ~35%) */}
          <div className="hidden md:flex md:w-[35%] bg-moodkin-dark relative overflow-hidden">
            {/* Subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-moodkin-dark via-moodkin-dark to-moodkin-gold/10" />

            {/* Mockup container */}
            <div className="relative z-10 w-full h-full">
              {MockupComponent && <MockupComponent />}
            </div>

            {/* Brand mark */}
            <div className="absolute top-6 left-6 z-20">
              <span className="text-white/60 text-xs tracking-[0.25em] font-light">MOODKIN</span>
            </div>

            {/* Step dots */}
            <div className="absolute bottom-6 left-6 flex gap-1.5 z-20">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    idx === currentStepIndex
                      ? 'bg-moodkin-gold w-6'
                      : idx < currentStepIndex
                      ? 'bg-moodkin-gold/60 w-1.5'
                      : 'bg-white/20 w-1.5'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Right side - Content (~65%) */}
          <div className="flex-1 flex flex-col p-6 md:p-8 lg:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-moodkin-gray uppercase tracking-wider">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <button
                type="button"
                onClick={skipOnboarding}
                className="text-xs text-moodkin-gray hover:text-moodkin-dark transition-colors"
              >
                Skip tour
              </button>
            </div>

            {/* Mobile mockup */}
            <div className="flex md:hidden justify-center mb-4 h-40">
              <div className="h-full aspect-[3/4] bg-moodkin-dark rounded-2xl overflow-hidden">
                {MockupComponent && <MockupComponent />}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center">
              {currentStep.subtitle && (
                <p className="text-moodkin-gold font-medium text-xs md:text-sm mb-2 tracking-wider uppercase">
                  {currentStep.subtitle}
                </p>
              )}

              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-moodkin-dark mb-3 md:mb-4 tracking-tight">
                {currentStep.title}
              </h2>

              <p className="text-moodkin-gray text-sm md:text-base leading-relaxed max-w-lg">
                {currentStep.description}
              </p>

              {/* Feature highlights for welcome step */}
              {currentStep.id === 'welcome' && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: 'Invite clients' },
                    { icon: Palette, label: 'Create moodboards' },
                    { icon: Link2, label: 'Share inspiration' },
                    { icon: Sparkles, label: 'AI-powered tools' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-moodkin-dark">
                      <div className="w-7 h-7 rounded-full bg-moodkin-gold/20 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-moodkin-gold" />
                      </div>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-moodkin-light-gray/30">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={prevStep}
                disabled={isFirstStep}
                className={cn(
                  'gap-1',
                  isFirstStep && 'invisible'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>

              {/* Mobile step dots */}
              <div className="flex md:hidden gap-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      idx === currentStepIndex
                        ? 'bg-moodkin-gold w-4'
                        : idx < currentStepIndex
                        ? 'bg-moodkin-gold/60 w-1.5'
                        : 'bg-moodkin-light-gray w-1.5'
                    )}
                  />
                ))}
              </div>

              {isLastStep ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={completeOnboarding}
                  className="gap-1 px-6"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  className="gap-1 px-6"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
