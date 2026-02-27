import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Stripe secret key is not configured')
  }
  return new Stripe(key)
}

export async function POST() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const stripe = getStripe()

    // Get user's stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('stripeid')
      .eq('id', session.user.id)
      .single()

    if (error || !user?.stripeid) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeid,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create portal session'
    // Check if it's a "customer not found" error
    if (message.includes('No such customer') || message.includes('resource_missing')) {
      return NextResponse.json(
        { error: 'Customer not found. Your subscription may have been created on a different Stripe account.' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
