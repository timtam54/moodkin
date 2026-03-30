// Subscription configuration
// Change this value to update the subscription price across the entire app

export const subscriptionConfig = {
  // Price in AUD (will be converted to cents for Stripe)
  price: 15,

  // Currency code
  currency: 'aud' as const,

  // Billing period
  period: 'month' as const,

  // Premium features
  features: {
    maxProjects: Infinity, // Unlimited
    aiImagesPerMonth: 100,
    imageResolution: '1024x1024',
  },

  // Free tier limits
  freeTier: {
    maxProjects: 3,
    aiImagesPerMonth: 0,
  },
}

// Helper to format price for display
export function formatPrice(price: number = subscriptionConfig.price): string {
  return `$${price}`
}

// Helper to format price with period
export function formatPriceWithPeriod(
  price: number = subscriptionConfig.price,
  period: string = subscriptionConfig.period
): string {
  return `$${price}/${period}`
}

// Get price in cents for Stripe
export function getPriceInCents(price: number = subscriptionConfig.price): number {
  return Math.round(price * 100)
}

// Check if stripeid is valid (Stripe customer ID or Free Tester promo)
function isValidStripeid(stripeid: string | null | undefined): boolean {
  if (!stripeid) return false
  return stripeid.startsWith('cus_') || stripeid === 'Free Tester'
}

// Check if subscription is active based on stripeid and subscription_ends_at
export function isSubscriptionActive(
  stripeid: string | null | undefined,
  subscriptionEndsAt: string | null | undefined
): boolean {
  // Must have a valid Stripe customer ID or promo code
  if (!isValidStripeid(stripeid)) {
    return false
  }

  // If no end date set, consider inactive (legacy data without end date)
  if (!subscriptionEndsAt) {
    return false
  }

  // Check if subscription end date is in the future
  const endsAt = new Date(subscriptionEndsAt)
  return endsAt > new Date()
}

// Subscription state for UI messaging
export type SubscriptionState =
  | { status: 'none' }  // Never subscribed
  | { status: 'active'; endsAt: Date }  // Active and auto-renewing
  | { status: 'cancelled'; endsAt: Date }  // Cancelled but still has access until endsAt
  | { status: 'expired' }  // Payment failed or subscription ended

export function getSubscriptionState(
  stripeid: string | null | undefined,
  subscriptionEndsAt: string | null | undefined,
  subscriptionStatus: string | null | undefined
): SubscriptionState {
  // Never had a subscription
  if (!isValidStripeid(stripeid)) {
    return { status: 'none' }
  }

  // No end date set - treat as none
  if (!subscriptionEndsAt) {
    return { status: 'none' }
  }

  const endsAt = new Date(subscriptionEndsAt)
  const now = new Date()

  // Subscription has ended
  if (endsAt <= now) {
    return { status: 'expired' }
  }

  // Still has access - check if cancelled or active
  if (subscriptionStatus === 'cancelled') {
    return { status: 'cancelled', endsAt }
  }

  if (subscriptionStatus === 'expired') {
    // Payment failed but somehow ends_at is still in future (shouldn't happen after fix)
    return { status: 'expired' }
  }

  return { status: 'active', endsAt }
}

// Get current month string in YYYY-MM format for AI image count reset tracking
export function getCurrentMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
