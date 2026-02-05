import { NextRequest, NextResponse } from 'next/server'
import { exchangeGoogleCode, getGoogleUserInfo } from '@/lib/auth/google'
import { createSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const returnUrl = state ? decodeURIComponent(state) : null

  if (error) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code)

    // Get user info
    const userInfo = await getGoogleUserInfo(tokens.access_token)

    const supabase = await createServiceClient()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userInfo.email)
      .single()

    if (existingUser) {
      // Update existing user
      await supabase
        .from('users')
        .update({
          auth_provider: 'google',
          auth_provider_id: userInfo.id,
          name: userInfo.name,
          avatar_url: userInfo.picture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

      await createSession(existingUser.id)
      return NextResponse.redirect(new URL(returnUrl || '/dashboard', request.url))
    }

    // New user - create account
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
        auth_provider: 'google',
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
      return NextResponse.redirect(new URL('/login?error=create_failed', request.url))
    }

    await createSession(newUser.id)
    return NextResponse.redirect(new URL(returnUrl || '/dashboard', request.url))
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}
