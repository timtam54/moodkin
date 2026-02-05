import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

// POST - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const { endpoint, keys } = await request.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: session.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) {
      console.error('Error saving push subscription:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
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
