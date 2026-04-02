import * as jose from 'jose'

interface AppleTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token: string
}

interface AppleIdTokenPayload {
  iss: string
  aud: string
  exp: number
  iat: number
  sub: string // User's unique identifier
  email?: string
  email_verified?: string | boolean
  is_private_email?: string | boolean
  real_user_status?: number
}

export interface AppleUserInfo {
  id: string
  email: string | null
  name: string | null
}

// Generate the client secret JWT for Apple OAuth
export async function generateAppleClientSecret(): Promise<string> {
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const teamId = process.env.APPLE_TEAM_ID!
  const clientId = process.env.APPLE_CLIENT_ID!
  const keyId = process.env.APPLE_KEY_ID!

  const key = await jose.importPKCS8(privateKey, 'ES256')

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('5m') // Short-lived for security
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(key)

  return jwt
}

export async function exchangeAppleCode(
  code: string,
  redirectUri: string
): Promise<AppleTokenResponse> {
  const clientSecret = await generateAppleClientSecret()

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Apple token exchange error:', errorText)
    throw new Error('Failed to exchange Apple auth code')
  }

  return response.json()
}

// Decode and verify the Apple id_token to get user info
export async function getAppleUserInfo(idToken: string): Promise<AppleUserInfo> {
  // Decode the JWT payload (Apple's id_token is a JWT)
  const payload = jose.decodeJwt(idToken) as AppleIdTokenPayload

  return {
    id: payload.sub,
    email: payload.email || null,
    name: null, // Apple only sends name in the initial POST body, not in the token
  }
}
