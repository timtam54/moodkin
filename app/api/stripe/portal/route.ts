import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
