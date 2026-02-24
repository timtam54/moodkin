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

// GET - Check subscription status from Stripe
export async function GET() {
  try {
    const session = await requireSession()

    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'No email found in session',
        hasCustomer: false,
        subscribed: false
      })
    }

    const stripe = getStripe()

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({
        hasCustomer: false,
        subscribed: false,
        message: 'No Stripe customer found for this email'
      })
    }

    const customer = customers.data[0]

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        hasCustomer: true,
        customerId: customer.id,
        subscribed: false,
        message: 'Customer exists but no subscriptions found'
      })
    }

    // Return subscription details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subs = subscriptions.data.map((sub: any) => {
      let currentPeriodEnd = null
      if (sub.current_period_end) {
        try {
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
        } catch {
          currentPeriodEnd = null
        }
      }
      return {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      }
    })

    const activeSub = subscriptions.data.find(s => s.status === 'active' || s.status === 'trialing')

    let activeSubPeriodEnd = null
    if (activeSub) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const periodEnd = (activeSub as any).current_period_end
      if (periodEnd) {
        try {
          activeSubPeriodEnd = new Date(periodEnd * 1000).toISOString()
        } catch {
          activeSubPeriodEnd = null
        }
      }
    }

    return NextResponse.json({
      hasCustomer: true,
      customerId: customer.id,
      subscribed: !!activeSub,
      subscriptions: subs,
      activeSubscription: activeSub ? {
        id: activeSub.id,
        status: activeSub.status,
        currentPeriodEnd: activeSubPeriodEnd,
      } : null
    })
  } catch (error) {
    console.error('Check subscription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Check failed'
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        hasCustomer: false,
        subscribed: false
      },
      { status: 500 }
    )
  }
}

// POST - Sync subscription to database
export async function POST() {
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
      return NextResponse.json({ success: false, message: 'No customer found' })
    }

    const customer = customers.data[0]

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    let activeSub = subscriptions.data[0]

    if (!activeSub) {
      // Check trialing
      const trialingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 1,
      })
      activeSub = trialingSubs.data[0]
    }

    if (!activeSub) {
      return NextResponse.json({ success: false, message: 'No active subscription found' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodEnd = new Date((activeSub as any).current_period_end * 1000)

    // Update database
    const { error } = await supabase
      .from('users')
      .update({
        stripeid: customer.id,
        subscription_status: 'active',
        subscription_ends_at: currentPeriodEnd.toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ success: false, message: 'Database update failed', error: error.message })
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      subscriptionId: activeSub.id,
      endsAt: currentPeriodEnd.toISOString(),
    })
  } catch (error) {
    console.error('Sync subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel subscription (single or all)
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    const stripe = getStripe()
    const supabase = await createServiceClient()

    // Check if a specific subscription ID was provided
    let subscriptionId: string | null = null
    try {
      const body = await request.json()
      subscriptionId = body.subscriptionId || null
    } catch {
      // No body provided, will cancel all
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ success: false, message: 'No customer found' }, { status: 404 })
    }

    const customer = customers.data[0]

    // If specific subscription ID provided, cancel just that one
    if (subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId)
      return NextResponse.json({
        success: true,
        message: `Cancelled subscription ${subscriptionId}`,
      })
    }

    // Otherwise, cancel all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ success: false, message: 'No active subscription to cancel' }, { status: 404 })
    }

    // Cancel all active subscriptions
    for (const sub of subscriptions.data) {
      await stripe.subscriptions.cancel(sub.id)
    }

    // Update database
    await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
      })
      .eq('id', session.user.id)

    return NextResponse.json({
      success: true,
      message: `Cancelled ${subscriptions.data.length} subscription(s)`,
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cancel failed' },
      { status: 500 }
    )
  }
}
