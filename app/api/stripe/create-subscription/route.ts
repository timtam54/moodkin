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

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const stripe = getStripe()
    const body = await request.json()
    const { username } = body as { username: string }

    // Create or retrieve customer
    let stripeCustomerId: string

    const existingCustomers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id
      // Update metadata if needed
      if (!existingCustomers.data[0].metadata?.userId) {
        await stripe.customers.update(stripeCustomerId, {
          metadata: { userId: session.user.id },
        })
      }
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: username,
        metadata: {
          userId: session.user.id,
        },
      })
      stripeCustomerId = customer.id
    }

    // Check if customer already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    })

    if (existingSubscriptions.data.length > 0) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        alreadySubscribed: true,
      }, { status: 400 })
    }

    // Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: Math.round(subscriptionConfig.price * 100),
      currency: subscriptionConfig.currency,
      recurring: {
        interval: subscriptionConfig.period,
      },
      product_data: {
        name: 'Moodkin Premium',
      },
    })

    // Create subscription with incomplete status until payment confirmed
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: session.user.id,
      },
    })

    // Get client secret from the payment intent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any
    const paymentIntent = invoice?.payment_intent
    const clientSecret = paymentIntent?.client_secret as string | null

    if (!clientSecret) {
      throw new Error('Failed to create payment intent')
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId,
    })

  } catch (error) {
    console.error('Stripe subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Subscription failed' },
      { status: 500 }
    )
  }
}
