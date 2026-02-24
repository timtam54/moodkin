import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import Stripe from 'stripe'
import { subscriptionConfig } from '@/lib/config/subscription'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// Get or create the subscription price
async function getOrCreatePrice(stripe: Stripe): Promise<string> {
  // Check if we have a price ID in env
  if (process.env.STRIPE_PRICE_ID && process.env.STRIPE_PRICE_ID !== 'your_stripe_price_id') {
    return process.env.STRIPE_PRICE_ID
  }

  // Look for existing Moodkin Premium product
  const products = await stripe.products.list({ limit: 10 })
  let product = products.data.find(p => p.name === 'Moodkin Premium' && p.active)

  if (!product) {
    // Create the product
    product = await stripe.products.create({
      name: 'Moodkin Premium',
      description: 'Unlimited projects, 100 AI images/month, 1024x1024 resolution',
    })
  }

  // Look for existing price on this product
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  })

  const existingPrice = prices.data.find(
    p => p.unit_amount === subscriptionConfig.price * 100 &&
         p.currency === subscriptionConfig.currency &&
         p.recurring?.interval === subscriptionConfig.period
  )

  if (existingPrice) {
    return existingPrice.id
  }

  // Create new price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: subscriptionConfig.price * 100,
    currency: subscriptionConfig.currency,
    recurring: {
      interval: subscriptionConfig.period,
    },
  })

  return price.id
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  try {
    const session = await requireSession()
    const body = await request.json()
    const { username } = body as { username: string }

    // Create or retrieve customer
    let customer: Stripe.Customer

    const existingCustomers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      // Update metadata if needed
      if (!customer.metadata?.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { userId: session.user.id },
        })
      }
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: username,
        metadata: {
          userId: session.user.id,
        },
      })
    }

    // Check if customer already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    if (existingSubscriptions.data.length > 0) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        alreadySubscribed: true,
      }, { status: 400 })
    }

    // Get or create the price
    const priceId = await getOrCreatePrice(stripe)

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moodkin.vercel.app'

    // Create a Checkout Session for subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard/projects?subscription=success`,
      cancel_url: `${baseUrl}/dashboard/projects?subscription=cancelled`,
      metadata: {
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
    })

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      customerId: customer.id,
    })
  } catch (error) {
    console.error('Stripe subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Subscription failed' },
      { status: 500 }
    )
  }
}
