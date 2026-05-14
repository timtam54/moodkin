import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { reconcileSubscriptionFromLastInvoice } from '@/lib/stripe/reconcile-from-invoice'
import type { SubscriptionStatus, CreativeClientType } from '@/types/database'

const SESSION_COOKIE_NAME = 'moodkin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const BILLING_NOTICE_COOKIE = 'moodkin_billing_notice'
const BILLING_NOTICE_MAX_AGE = 60 * 5 // 5 minutes — long enough for first dashboard render

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  creativeClient: CreativeClientType | null
  subscriptionStatus?: SubscriptionStatus
  subscriptionEndsAt?: string | null
  stripeid?: string | null
  tourDisplayed?: boolean | null
  aiImagesCount?: number
  aiCountResetMonth?: string | null
}

export interface Session {
  user: SessionUser
  expiresAt: string
}

interface SessionData {
  userId: string
  expiresAt: string
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString()

  const sessionData: SessionData = {
    userId,
    expiresAt,
  }

  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64')

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  // Catch up on any missed Stripe webhooks: if DB says lapsed but Stripe has a
  // recent paid invoice, extend subscription_ends_at to last_payment + 31 days.
  // If Stripe shows the user has lapsed, mark expired and drop a one-shot
  // cookie so the dashboard can show a billing notice toast.
  try {
    const supabase = await createServiceClient()
    const { data: u } = await supabase
      .from('users')
      .select('stripeid, subscription_ends_at')
      .eq('id', userId)
      .single()
    if (u) {
      const result = await reconcileSubscriptionFromLastInvoice({
        userId,
        stripeId: u.stripeid,
        subscriptionEndsAt: u.subscription_ends_at,
      })
      if (result.kind === 'lapsed') {
        cookieStore.set(BILLING_NOTICE_COOKIE, '1', {
          httpOnly: false, // dashboard layout reads server-side; client-readable is fine
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: BILLING_NOTICE_MAX_AGE,
          path: '/',
        })
      }
    }
  } catch (err) {
    console.error('[createSession] reconcile failed (non-fatal)', err)
  }

  return sessionToken
}

export async function hasBillingNotice(): Promise<boolean> {
  const cookieStore = await cookies()
  return Boolean(cookieStore.get(BILLING_NOTICE_COOKIE)?.value)
}

export async function clearBillingNotice(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(BILLING_NOTICE_COOKIE)
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    return null
  }

  try {
    const raw = JSON.parse(
      Buffer.from(sessionToken, 'base64').toString('utf-8')
    )

    // Handle both old format (with userType) and new format
    const sessionData: SessionData = {
      userId: raw.userId,
      expiresAt: raw.expiresAt,
    }

    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return null
    }

    const supabase = await createServiceClient()

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionData.userId)
      .single()

    if (!user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        creativeClient: user.creative_client,
        subscriptionStatus: user.subscription_status,
        subscriptionEndsAt: user.subscription_ends_at,
        stripeid: user.stripeid,
        tourDisplayed: user.tour_displayed,
        aiImagesCount: user.ai_images_count,
        aiCountResetMonth: user.ai_count_reset_month,
      },
      expiresAt: sessionData.expiresAt,
    }
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
