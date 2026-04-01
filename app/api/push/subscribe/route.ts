import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

// POST - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const { endpoint, keys } = await request.json()

    console.log('[Push Subscribe] Received subscription for user:', session.user.id)
    console.log('[Push Subscribe] Endpoint:', endpoint?.slice(0, 50) + '...')
    console.log('[Push Subscribe] Keys p256dh length:', keys?.p256dh?.length)
    console.log('[Push Subscribe] Keys auth length:', keys?.auth?.length)

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.error('[Push Subscribe] Invalid subscription data')
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Delete any existing subscription for this user+endpoint first, then insert
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('endpoint', endpoint)

    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })
      .select()

    if (error) {
      console.error('[Push Subscribe] Error saving subscription:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Push Subscribe] Insert result:', data)

    console.log('[Push Subscribe] Successfully saved subscription for user:', session.user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Push Subscribe] Unexpected error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE - Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
