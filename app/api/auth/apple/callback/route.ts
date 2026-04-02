import { NextRequest, NextResponse } from 'next/server'
import { exchangeAppleCode, getAppleUserInfo } from '@/lib/auth/apple'
import { createSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

// Helper to redirect with 303 (See Other) - required for POST handlers
// so browser uses GET for the redirect instead of POST
function redirect(url: URL) {
  return NextResponse.redirect(url, { status: 303 })
}

// Apple sends the callback as a POST request with form data
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const code = formData.get('code') as string | null
  const error = formData.get('error') as string | null
  const state = formData.get('state') as string | null
  const userDataString = formData.get('user') as string | null

  const returnUrl = state ? decodeURIComponent(state) : null

  if (error) {
    console.error('Apple auth error:', error)
    return redirect(new URL('/login?error=apple_auth_failed', request.url))
  }

  if (!code) {
    return redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`

    // Exchange code for tokens
    const tokens = await exchangeAppleCode(code, redirectUri)

    // Get user info from id_token
    const userInfo = await getAppleUserInfo(tokens.id_token)

    // Apple only sends user data (name) on the first authorization
    // It comes as a JSON string in the 'user' form field
    let userName: string | null = null
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString)
        if (userData.name) {
          userName = [userData.name.firstName, userData.name.lastName]
            .filter(Boolean)
            .join(' ')
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (!userInfo.email) {
      return redirect(new URL('/login?error=no_email', request.url))
    }

    const supabase = await createServiceClient()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', userInfo.email)
      .single()

    if (existingUser) {
      // Update existing user
      await supabase
        .from('users')
        .update({
          auth_provider: 'apple',
          auth_provider_id: userInfo.id,
          // Only update name if we got one from Apple and user doesn't have one
          ...(userName && !existingUser.name && { name: userName }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

      await createSession(existingUser.id)
      return redirect(new URL(returnUrl || '/dashboard', request.url))
    }

    // New user - create account
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: userInfo.email,
        name: userName || userInfo.email.split('@')[0], // Fallback to email prefix
        auth_provider: 'apple',
        auth_provider_id: userInfo.id,
        subscription_status: 'trial',
        subscription_ends_at: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
        ).toISOString(),
      })
      .select('id')
      .single()

    if (createError || !newUser) {
      console.error('Error creating user:', createError)
      return redirect(new URL('/login?error=create_failed', request.url))
    }

    await createSession(newUser.id)
    return redirect(new URL(returnUrl || '/dashboard', request.url))
  } catch (error) {
    console.error('Apple auth error:', error)
    return redirect(new URL('/login?error=auth_failed', request.url))
  }
}
