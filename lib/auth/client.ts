'use client'

// Google OAuth - initiate login
export function loginWithGoogle(returnUrl?: string) {
  const state = returnUrl ? encodeURIComponent(returnUrl) : ''

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  })

  // Direct assignment is most reliable across different contexts (webviews, etc.)
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Microsoft OAuth - initiate login
export function loginWithMicrosoft(returnUrl?: string) {
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'common'
  const state = returnUrl ? encodeURIComponent(returnUrl) : ''

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/api/auth/microsoft/callback`,
    response_type: 'code',
    scope: 'openid profile email User.Read',
    response_mode: 'query',
    ...(state && { state }),
  })

  window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

// Logout
export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/'
}
