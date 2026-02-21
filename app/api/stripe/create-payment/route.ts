import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { amount, username } = body as { amount: number; username: string }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Create or retrieve customer
    let customer: Stripe.Customer

    // Check if user already has a Stripe customer ID
    const existingCustomers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: session.user.email,
        name: username,
        metadata: {
          userId: session.user.id,
        },
      })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
      customer: customer.id,
      metadata: {
        userId: session.user.id,
        username: username,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    })
  } catch (error) {
    console.error('Stripe payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    )
  }
}
