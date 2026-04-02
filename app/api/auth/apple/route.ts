import { NextRequest, NextResponse } from 'next/server'

// GET - Redirect to Apple OAuth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || ''

  // Don't encode here - URLSearchParams will handle encoding
  const state = returnUrl || ''

  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`,
    response_type: 'code',
    scope: 'name email',
    response_mode: 'form_post', // Apple uses POST for the callback
    ...(state && { state }),
  })

  return NextResponse.redirect(
    `https://appleid.apple.com/auth/authorize?${params.toString()}`
  )
}
