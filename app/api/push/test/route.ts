import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

webpush.setVapidDetails(
  'mailto:hello@moodkinstudio.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// GET - Test push notification to current user
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    console.log('[Push Test] Testing for user:', session.user.id)

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)

    if (error) {
      console.error('[Push Test] DB error:', error)
      return NextResponse.json({ error: error.message, step: 'db_query' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push Test] No subscriptions found for user')
      return NextResponse.json({
        error: 'No push subscriptions found for your account. Please enable notifications first.',
        step: 'no_subscriptions',
        userId: session.user.id
      }, { status: 404 })
    }

    console.log('[Push Test] Found', subscriptions.length, 'subscriptions')

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'Push notifications are working!',
      conversationId: null,
    })

    const results = []
    for (const sub of subscriptions) {
      try {
        console.log('[Push Test] Sending to endpoint:', sub.endpoint.slice(0, 60) + '...')
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        results.push({ endpoint: sub.endpoint.slice(0, 60), status: 'success' })
        console.log('[Push Test] Success!')
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string }
        console.error('[Push Test] Failed:', error.statusCode, error.message)
        results.push({
          endpoint: sub.endpoint.slice(0, 60),
          status: 'failed',
          statusCode: error.statusCode,
          message: error.message
        })

        // Clean up stale subscription
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          console.log('[Push Test] Deleted stale subscription')
        }
      }
    }

    return NextResponse.json({
      message: 'Test complete',
      subscriptionCount: subscriptions.length,
      results
    })
  } catch (err) {
    console.error('[Push Test] Unexpected error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
