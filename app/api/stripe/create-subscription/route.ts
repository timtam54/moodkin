import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(req: Request) {
  try {
    const { amount, customerId, email, name } = await req.json()

    let stripeCustomerId = customerId

    // Create customer if doesn't exist, or find by email
    if (!stripeCustomerId && email) {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          name: name
        }
      })
      stripeCustomerId = customer.id
    }

    // Check for and cancel any incomplete subscriptions
    const incompleteSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'incomplete',
    })

    for (const sub of incompleteSubscriptions.data) {
      await stripe.subscriptions.cancel(sub.id)
    }

    // Check if already has active subscription
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    })

    if (activeSubscriptions.data.length > 0) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        alreadySubscribed: true,
      }, { status: 400 })
    }

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

    // Create subscription
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
        paymentIntentId: paymentIntent?.id,
        paymentIntentStatus: paymentIntent?.status,
        customerId: stripeCustomerId,
        email: email
      }
      console.error('No client_secret returned from Stripe subscription', debugInfo);
      return NextResponse.json({
        error: 'Failed to initialize payment - no client secret returned',
        debug: debugInfo
      }, { status: 500 });
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
