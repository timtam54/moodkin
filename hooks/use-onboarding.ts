'use client'

import { useState, useCallback } from 'react'
import { useSession } from '@/hooks/use-session'

export interface OnboardingStep {
  id: string
  title: string
  description: string
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Moodkin',
    description: 'Visual collaboration for creatives',
  },
  {
    id: 'invite',
    title: 'Invite & Collaborate',
    description: 'Work together seamlessly',
  },
  {
    id: 'moodboards',
    title: 'Create Moodboards',
    description: 'Bring ideas to life',
  },
  {
    id: 'ai',
    title: 'AI-Powered Tools',
    description: 'Enhance your workflow',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'Start creating',
  },
]

export function useOnboarding() {
  const { session, refetch } = useSession()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isManuallyActive, setIsManuallyActive] = useState(false)

  // Tour should show if:
  // 1. User is logged in AND tour_displayed is null (never seen)
  // 2. OR user manually triggered it via restartOnboarding
  const shouldShowTour = session?.user && (
    session.user.tourDisplayed === null ||
    session.user.tourDisplayed === undefined ||
    isManuallyActive
  )

  const currentStep = onboardingSteps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === onboardingSteps.length - 1
  const progress = ((currentStepIndex + 1) / onboardingSteps.length) * 100

  const nextStep = useCallback(() => {
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [currentStepIndex])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  const markTourComplete = useCallback(async () => {
    try {
      await fetch('/api/user/tour', { method: 'PATCH' })
      // Refetch session to update the tourDisplayed value
      refetch()
    } catch (error) {
      console.error('Failed to mark tour as complete:', error)
    }
  }, [refetch])

  const completeOnboarding = useCallback(async () => {
    setIsManuallyActive(false)
    await markTourComplete()
  }, [markTourComplete])

  const skipOnboarding = useCallback(async () => {
    setIsManuallyActive(false)
    await markTourComplete()
  }, [markTourComplete])

  const restartOnboarding = useCallback(async () => {
    // Reset to null in database so tour shows again
    try {
      await fetch('/api/user/tour', { method: 'DELETE' })
      setCurrentStepIndex(0)
      setIsManuallyActive(true)
      refetch()
    } catch (error) {
      console.error('Failed to restart tour:', error)
    }
  }, [refetch])

  return {
    isOnboardingActive: shouldShowTour,
    currentStep,
    currentStepIndex,
    totalSteps: onboardingSteps.length,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding,
    restartOnboarding,
  }
}
