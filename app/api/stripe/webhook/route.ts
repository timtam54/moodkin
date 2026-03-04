import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature if secret is configured
    if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'your_stripe_webhook_secret') {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } else {
      // For development without webhook secret
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const userId = subscription.metadata?.userId

        // Get subscription end date
        const currentPeriodEnd = new Date((subscription.current_period_end as number) * 1000)

        // Determine subscription status
        let status: 'active' | 'cancelled' | 'expired' | 'trial' = 'trial'
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          status = 'active'
        } else if (subscription.status === 'canceled') {
          status = 'cancelled'
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          status = 'expired'
        }

        // Update user by userId from metadata or by customer email
        if (userId) {
          await supabase
            .from('users')
            .update({
              stripeid: customerId,
              subscription_status: status,
              subscription_ends_at: currentPeriodEnd.toISOString(),
            })
            .eq('id', userId)
        } else {
          // Fallback: get customer email and update by email
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
          if (customer.email) {
            await supabase
              .from('users')
              .update({
                stripeid: customerId,
                subscription_status: status,
                subscription_ends_at: currentPeriodEnd.toISOString(),
              })
              .eq('email', customer.email)
          }
        }

        console.log(`Subscription ${event.type}: ${subscription.id}, status: ${status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = subscription.metadata?.userId

        // Mark subscription as cancelled
        if (userId) {
          await supabase
            .from('users')
            .update({
              subscription_status: 'cancelled',
            })
            .eq('id', userId)
        } else {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
          if (customer.email) {
            await supabase
              .from('users')
              .update({
                subscription_status: 'cancelled',
              })
              .eq('email', customer.email)
          }
        }

        console.log(`Subscription cancelled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          // Get subscription details for the end date
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any
          const currentPeriodEnd = new Date((subscription.current_period_end as number) * 1000)
          const userId = subscription.metadata?.userId

          if (userId) {
            await supabase
              .from('users')
              .update({
                stripeid: customerId,
                subscription_status: 'active',
                subscription_ends_at: currentPeriodEnd.toISOString(),
              })
              .eq('id', userId)
          } else {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
            if (customer.email) {
              await supabase
                .from('users')
                .update({
                  stripeid: customerId,
                  subscription_status: 'active',
                  subscription_ends_at: currentPeriodEnd.toISOString(),
                })
                .eq('email', customer.email)
            }
          }

          console.log(`Invoice paid for subscription: ${subscriptionId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Mark subscription as expired due to payment failure
        // Note: subscription_ends_at is already at/past current time since Stripe
        // charges at the end of the billing period
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        if (customer.email) {
          await supabase
            .from('users')
            .update({
              subscription_status: 'expired',
            })
            .eq('email', customer.email)
        }

        console.log(`Payment failed for customer: ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
