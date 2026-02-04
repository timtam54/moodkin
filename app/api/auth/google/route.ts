import { NextRequest, NextResponse } from 'next/server'

// GET - Redirect to Google OAuth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || ''

  // Don't encode here - URLSearchParams will handle encoding
  const state = returnUrl || ''

  // Get the base URL from the request
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
