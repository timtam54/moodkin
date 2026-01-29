// Google OAuth config
export const googleConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  redirectUri: typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/google/callback`
    : '',
  scopes: ['openid', 'email', 'profile'],
}

// Microsoft OAuth config
export const microsoftConfig = {
  clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
  tenantId: process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'common',
  redirectUri: typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/microsoft/callback`
    : '',
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}
