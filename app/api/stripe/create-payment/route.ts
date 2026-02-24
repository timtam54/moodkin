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
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length > 0) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        alreadySubscribed: true,
      }, { status: 400 })
    }

    // Get or create the price
    const priceId = await getOrCreatePrice(stripe)

    // Create subscription with payment
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: session.user.id,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any

    console.log('Subscription created:', subscription.id)
    console.log('Invoice:', invoice?.id)
    console.log('Payment Intent:', invoice?.payment_intent)

    // Handle both expanded and non-expanded payment_intent
    let clientSecret: string | null = null

    if (typeof invoice?.payment_intent === 'object' && invoice.payment_intent?.client_secret) {
      // Expanded payment intent
      clientSecret = invoice.payment_intent.client_secret
    } else if (typeof invoice?.payment_intent === 'string') {
      // Non-expanded - need to retrieve it
      const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent)
      clientSecret = pi.client_secret
    }

    if (!clientSecret) {
      console.error('No client secret found. Invoice:', JSON.stringify(invoice, null, 2))
      throw new Error('Failed to create subscription payment - no client secret')
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
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
