import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import {
  acknowledgeSubscription,
  getSubscriptionPurchase,
} from '@/lib/play-billing/server'

/**
 * Verify a Google Play Billing purchase and grant entitlement.
 *
 * Client sends { purchaseToken, productId } after Play Billing returns.
 * We call subscriptionsv2.get to confirm state=ACTIVE (or IN_GRACE_PERIOD),
 * acknowledge the purchase, then update the users row. From that point on
 * the RTDN webhook keeps subscription_ends_at fresh.
 */
export async function POST(request: NextRequest) {
  let session
  try {
    session = await requireSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packageName = process.env.ANDROID_PACKAGE_NAME
  if (!packageName) {
    return NextResponse.json(
      { error: 'ANDROID_PACKAGE_NAME not configured' },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => null)) as
    | { purchaseToken?: string; productId?: string }
    | null
  if (!body?.purchaseToken || !body?.productId) {
    return NextResponse.json(
      { error: 'purchaseToken and productId are required' },
      { status: 400 }
    )
  }

  let purchase
  try {
    purchase = await getSubscriptionPurchase(packageName, body.purchaseToken)
  } catch (err) {
    console.error('[play-billing/verify] Play API error', err)
    return NextResponse.json(
      { error: 'Failed to verify purchase with Google Play' },
      { status: 502 }
    )
  }

  const ok =
    purchase.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ||
    purchase.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  if (!ok) {
    return NextResponse.json(
      { error: `Subscription not active: ${purchase.subscriptionState}` },
      { status: 400 }
    )
  }

  const lineItem = purchase.lineItems.find((li) => li.productId === body.productId)
  if (!lineItem) {
    return NextResponse.json(
      { error: 'Purchase does not include the requested product' },
      { status: 400 }
    )
  }

  // Acknowledge within 3 days or Google auto-refunds.
  if (purchase.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    try {
      await acknowledgeSubscription(packageName, body.productId, body.purchaseToken)
    } catch (err) {
      console.error('[play-billing/verify] acknowledge failed', err)
      // Non-fatal — entitlement is still granted; we'll retry on next renewal.
    }
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({
      google_play_purchase_token: body.purchaseToken,
      google_play_product_id: body.productId,
      subscription_source: 'google_play',
      subscription_status: 'active',
      subscription_ends_at: lineItem.expiryTime,
    })
    .eq('id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    subscription_ends_at: lineItem.expiryTime,
    subscription_status: 'active',
    source: 'google_play',
  })
}
