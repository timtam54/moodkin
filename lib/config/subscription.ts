// Subscription configuration
// Change this value to update the subscription price across the entire app

export const subscriptionConfig = {
  // Price in AUD (will be converted to cents for Stripe)
  price: 1,

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

// Check if subscription is active based on stripeid and subscription_ends_at
export function isSubscriptionActive(
  stripeid: string | null | undefined,
  subscriptionEndsAt: string | null | undefined
): boolean {
  // Must have a valid Stripe customer ID
  if (!stripeid || !stripeid.startsWith('cus_')) {
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
