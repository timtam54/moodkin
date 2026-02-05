import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

webpush.setVapidDetails(
  'mailto:JobSafePro@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

interface PushPayload {
  title: string
  body: string
  conversationId: string
}

export async function sendPushToProjectMembers(
  supabase: SupabaseClient,
  conversationId: string,
  senderUserId: string,
  payload: PushPayload
) {
  try {
    // Get all accepted project members except the sender
    const { data: members } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('project_id', conversationId)
      .eq('invite_status', 'accepted')
      .neq('user_id', senderUserId)
      .not('user_id', 'is', null)

    if (!members || members.length === 0) {
      console.log('[Push] No other project members to notify')
      return
    }

    const userIds = members.map((m) => m.user_id).filter(Boolean) as string[]
    console.log('[Push] Found', userIds.length, 'other project members')

    // Get push subscriptions for those users
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No push subscriptions found for those users')
      return
    }

    console.log('[Push] Sending to', subscriptions.length, 'subscriptions')
    const payloadStr = JSON.stringify(payload)

    // Send push to each subscription
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadStr
        )
      )
    )

    // Clean up stale subscriptions (410 Gone or 404)
    const staleIds: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          staleIds.push(subscriptions[index].id)
        }
      }
    })

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }
  } catch (error) {
    console.error('Error sending push notifications:', error)
  }
}
