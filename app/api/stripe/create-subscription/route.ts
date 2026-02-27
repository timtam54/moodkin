import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    // Get the logged-in user from session
    const session = await requireSession()
    const { amount } = await req.json()

    const email = session.user.email
    const name = session.user.name || email

    // Always create a fresh customer (matches incidentaccident pattern)
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: session.user.id,
        name: name
      }
    })
    const stripeCustomerId = customer.id

    // Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: 'aud',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: 'Moodkin Premium',
      },
    })

    // Create subscription - exact same pattern as incidentaccident
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
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any
    const paymentIntent = invoice?.payment_intent
    const clientSecret = paymentIntent?.client_secret || null

    if (!clientSecret) {
      const debugInfo = {
        subscriptionId: subscription.id,
        invoiceId: invoice?.id,
        invoiceStatus: invoice?.status,
        paymentIntentId: paymentIntent?.id,
        paymentIntentStatus: paymentIntent?.status,
        customerId: stripeCustomerId,
        email: email
      }
      console.error('No client_secret returned from Stripe subscription', debugInfo)
      return NextResponse.json({
        error: 'Failed to initialize payment - no client secret returned',
        debug: debugInfo
      }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Stripe create-subscription error:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    return NextResponse.json({
      error: errorMessage,
      debug: {
        type: 'exception',
        stack: errorStack
      }
    }, { status: 400 })
  }
}
