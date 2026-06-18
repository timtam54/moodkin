import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSubscriptionPurchase } from '@/lib/play-billing/server'

/**
 * Google Play Real-Time Developer Notifications (RTDN) webhook.
 *
 * Setup: Play Console > Monetize > Real-time developer notifications, pointing
 * at a Pub/Sub topic. Pub/Sub is configured with a Push subscription whose
 * endpoint is this route, with `?token=<GOOGLE_PLAY_RTDN_VERIFICATION_TOKEN>`
 * so we can verify the caller is Google.
 *
 * https://developer.android.com/google/play/billing/rtdn-reference
 *
 * On every notification we re-fetch the canonical state via subscriptionsv2.get
 * and update the user's row. Notifications are best-effort, not exactly-once,
 * so we always reconcile against the API instead of trusting the message body.
 */

type RTDNNotification = {
  version: string
  packageName: string
  eventTimeMillis: string
  subscriptionNotification?: {
    version: string
    notificationType: number
    purchaseToken: string
    subscriptionId: string
  }
  testNotification?: { version: string }
}

type PubSubPushBody = {
  message: { data: string; messageId: string; publishTime: string }
  subscription: string
}

export async function POST(request: NextRequest) {
  const expected = process.env.GOOGLE_PLAY_RTDN_VERIFICATION_TOKEN
  if (expected) {
    const provided = new URL(request.url).searchParams.get('token')
    if (provided !== expected) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const envelope = (await request.json().catch(() => null)) as PubSubPushBody | null
  if (!envelope?.message?.data) {
    return NextResponse.json({ error: 'invalid envelope' }, { status: 400 })
  }

  let notification: RTDNNotification
  try {
    const decoded = Buffer.from(envelope.message.data, 'base64').toString('utf8')
    notification = JSON.parse(decoded) as RTDNNotification
  } catch {
    return NextResponse.json({ error: 'invalid notification payload' }, { status: 400 })
  }

  // Test notifications from Play Console — ack and return.
  if (notification.testNotification) {
    return NextResponse.json({ ok: true, test: true })
  }

  const sub = notification.subscriptionNotification
  if (!sub) {
    // Voided / one-time-product notifications — ignore (we only sell subs).
    return NextResponse.json({ ok: true, ignored: true })
  }

  const packageName = notification.packageName || process.env.ANDROID_PACKAGE_NAME
  if (!packageName) {
    return NextResponse.json({ error: 'no packageName' }, { status: 400 })
  }

  // Fetch canonical state — never trust the notification body alone.
  let purchase
  try {
    purchase = await getSubscriptionPurchase(packageName, sub.purchaseToken)
  } catch (err) {
    console.error('[play-billing/webhook] Play API error', err)
    // Return 200 so Pub/Sub doesn't retry forever on a permanent failure
    // (e.g. token from another environment). Real transient failures will
    // be re-delivered when the next notification arrives.
    return NextResponse.json({ ok: false, error: 'play_api_error' })
  }

  const supabase = await createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('google_play_purchase_token', sub.purchaseToken)
    .maybeSingle()

  if (!user) {
    console.warn('[play-billing/webhook] no user for purchaseToken', sub.purchaseToken.slice(0, 8))
    return NextResponse.json({ ok: true, unknown_token: true })
  }

  const lineItem = purchase.lineItems[0]
  const newStatus = mapState(purchase.subscriptionState)

  await supabase
    .from('users')
    .update({
      subscription_status: newStatus,
      subscription_ends_at: lineItem?.expiryTime ?? null,
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true, status: newStatus })
}

function mapState(state: string): 'active' | 'cancelled' | 'expired' {
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'active'
    case 'SUBSCRIPTION_STATE_CANCELED':
    case 'SUBSCRIPTION_STATE_PAUSED':
      // Still has access until expiryTime — UI shows "Cancelled, ends ..."
      return 'cancelled'
    case 'SUBSCRIPTION_STATE_EXPIRED':
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    default:
      return 'expired'
  }
}
