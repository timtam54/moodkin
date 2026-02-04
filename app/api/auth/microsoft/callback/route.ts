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
    const redirectUri = `${request.nextUrl.origin}/api/auth/microsoft/callback`

    // Exchange code for tokens
    const tokens = await exchangeMicrosoftCode(code, redirectUri)

    // Get user info
    const userInfo = await getMicrosoftUserInfo(tokens.access_token)

    const email = userInfo.mail || userInfo.userPrincipalName
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url))
    }

    const supabase = await createServiceClient()

    // Check if user exists as photographer
    const { data: existingPhotographer } = await supabase
      .from('photographers')
      .select('id')
      .eq('email', email)
      .single()

    if (existingPhotographer) {
      // Update existing photographer
      await supabase
        .from('photographers')
        .update({
          auth_provider: 'microsoft',
          auth_provider_id: userInfo.id,
          name: userInfo.displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPhotographer.id)

      await createSession(existingPhotographer.id, 'photographer')
      return NextResponse.redirect(new URL(returnUrl || '/dashboard', request.url))
    }

    // Check if user exists as client
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, photographer_id')
      .eq('email', email)
      .single()

    if (existingClient) {
      // Update existing client
      await supabase
        .from('clients')
        .update({
          auth_provider: 'microsoft',
          auth_provider_id: userInfo.id,
          name: userInfo.displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingClient.id)

      await createSession(existingClient.id, 'client')
      return NextResponse.redirect(new URL(returnUrl || '/c', request.url))
    }

    // New user - create photographer account
    const { data: newPhotographer, error: createError } = await supabase
      .from('photographers')
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

    if (createError || !newPhotographer) {
      console.error('Error creating photographer:', createError)
      return NextResponse.redirect(new URL('/login?error=create_failed', request.url))
    }

    await createSession(newPhotographer.id, 'photographer')
    return NextResponse.redirect(new URL(returnUrl || '/dashboard', request.url))
  } catch (error) {
    console.error('Microsoft auth error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}
