import { NextRequest, NextResponse } from 'next/server'

// GET - Redirect to Microsoft OAuth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || ''

  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'common'
  // Don't encode here - URLSearchParams will handle encoding
  const state = returnUrl || ''

  // Get the base URL from the request
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/microsoft/callback`,
    response_type: 'code',
    scope: 'openid profile email User.Read',
    response_mode: 'query',
    ...(state && { state }),
  })

  return NextResponse.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`)
}
