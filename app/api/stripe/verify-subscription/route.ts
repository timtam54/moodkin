import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

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
    const supabase = await createServiceClient()

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ subscribed: false })
    }

    const customer = customers.data[0]

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      // Also check for trialing
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 1,
      })

      if (trialingSubscriptions.data.length === 0) {
        return NextResponse.json({ subscribed: false })
      }

      // Use trialing subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = trialingSubscriptions.data[0] as any
      const currentPeriodEnd = new Date((subscription.current_period_end as number) * 1000)

      // Update user in database
      await supabase
        .from('users')
        .update({
          stripeid: customer.id,
          subscription_status: 'active',
          subscription_ends_at: currentPeriodEnd.toISOString(),
        })
        .eq('id', session.user.id)

      return NextResponse.json({
        subscribed: true,
        customerId: customer.id,
        endsAt: currentPeriodEnd.toISOString(),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = subscriptions.data[0] as any
    const currentPeriodEnd = new Date((subscription.current_period_end as number) * 1000)

    // Update user in database
    await supabase
      .from('users')
      .update({
        stripeid: customer.id,
        subscription_status: 'active',
        subscription_ends_at: currentPeriodEnd.toISOString(),
      })
      .eq('id', session.user.id)

    return NextResponse.json({
      subscribed: true,
      customerId: customer.id,
      endsAt: currentPeriodEnd.toISOString(),
    })
  } catch (error) {
    console.error('Verify subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
