import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const { amount } = await req.json()

    const email = session.user.email
    const name = session.user.name || email

    // Create a Stripe Checkout Session for subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Moodkin Premium',
            },
            unit_amount: Math.round(amount * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=cancelled`,
      metadata: {
        userId: session.user.id,
        userName: name,
      },
    })

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stripe checkout session error:', errorMessage)
    return NextResponse.json({
      error: errorMessage,
    }, { status: 400 })
  }
}
