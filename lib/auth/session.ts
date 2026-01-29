import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import type { Photographer, Client, SubscriptionStatus, CreativeClientType } from '@/types/database'

const SESSION_COOKIE_NAME = 'moodkin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: 'photographer' | 'client'
  subscriptionStatus?: SubscriptionStatus
  subscriptionEndsAt?: string | null
  creativeClient?: CreativeClientType | null
  photographerId?: string // For clients only
}

export interface Session {
  user: SessionUser
  expiresAt: string
}

interface SessionData {
  userId: string
  userType: 'photographer' | 'client'
  expiresAt: string
}

export async function createSession(
  userId: string,
  userType: 'photographer' | 'client'
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString()

  const sessionData: SessionData = {
    userId,
    userType,
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

  return sessionToken
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    return null
  }

  try {
    const sessionData: SessionData = JSON.parse(
      Buffer.from(sessionToken, 'base64').toString('utf-8')
    )

    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      await destroySession()
      return null
    }

    const supabase = await createServiceClient()

    if (sessionData.userType === 'photographer') {
      const { data: photographer } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', sessionData.userId)
        .single()

      if (!photographer) {
        await destroySession()
        return null
      }

      return {
        user: {
          id: photographer.id,
          email: photographer.email,
          name: photographer.name,
          avatarUrl: photographer.avatar_url,
          role: 'photographer',
          subscriptionStatus: photographer.subscription_status,
          subscriptionEndsAt: photographer.subscription_ends_at,
          creativeClient: photographer.creative_client,
        },
        expiresAt: sessionData.expiresAt,
      }
    } else {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', sessionData.userId)
        .single()

      if (!client) {
        await destroySession()
        return null
      }

      return {
        user: {
          id: client.id,
          email: client.email,
          name: client.name,
          avatarUrl: null,
          role: 'client',
          photographerId: client.photographer_id,
        },
        expiresAt: sessionData.expiresAt,
      }
    }
  } catch {
    await destroySession()
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

export async function requirePhotographer(): Promise<Session> {
  const session = await requireSession()
  if (session.user.role !== 'photographer') {
    throw new Error('Forbidden: Photographer access required')
  }
  return session
}
