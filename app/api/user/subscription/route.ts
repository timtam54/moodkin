import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const body = await request.json()
    const { stripeid } = body as { stripeid: string }

    // Validate stripeid - allow 'cus_' prefix (Stripe) or 'Free Tester' (promo code)
    if (!stripeid || (!stripeid.startsWith('cus_') && stripeid !== 'Free Tester')) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    // Calculate subscription end date (30 days from now)
    const subscriptionEndsAt = new Date()
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30)

    const { error } = await supabase
      .from('users')
      .update({
        stripeid,
        subscription_status: 'active',
        subscription_ends_at: subscriptionEndsAt.toISOString()
      })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stripeid,
      subscription_status: 'active',
      subscription_ends_at: subscriptionEndsAt.toISOString()
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
