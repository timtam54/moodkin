import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

interface MicrosoftTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
  id_token?: string
}

interface MicrosoftUserInfo {
  id: string
  displayName: string
  givenName?: string
  surname?: string
  mail?: string
  userPrincipalName: string
}

async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<MicrosoftTokenResponse> {
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'common'

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read',
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Microsoft token exchange error:', errorText)
    throw new Error('Failed to exchange Microsoft auth code')
  }

  return response.json()
}

async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Microsoft user info')
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const state = searchParams.get('state')
  const returnUrl = state ? decodeURIComponent(state) : null

  if (error) {
    console.error('Microsoft auth error:', error, errorDescription)
    return NextResponse.redirect(new URL('/login?error=microsoft_auth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`

    // Exchange code for tokens
    const tokens = await exchangeMicrosoftCode(code, redirectUri)

    // Get user info
    const userInfo = await getMicrosoftUserInfo(tokens.access_token)

    const email = userInfo.mail || userInfo.userPrincipalName
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url))
    }

    const supabase = await createServiceClient()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      // Update existing user
      await supabase
        .from('users')
        .update({
          auth_provider: 'microsoft',
          auth_provider_id: userInfo.id,
          name: userInfo.displayName,
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
        email,
        name: userInfo.displayName,
        auth_provider: 'microsoft',
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
    console.error('Microsoft auth error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}
