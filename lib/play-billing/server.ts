/**
 * Server-side helpers for talking to the Google Play Developer API.
 *
 * We sign a JWT with the service-account private key, exchange it for a
 * short-lived OAuth access token, then call the subscriptionsv2 endpoint.
 * Doing this with `jose` (already a dep) avoids pulling in `googleapis`.
 */

import { SignJWT, importPKCS8 } from 'jose'

type ServiceAccountCreds = {
  client_email: string
  private_key: string
}

function loadCreds(): ServiceAccountCreds {
  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (json) {
    const parsed = JSON.parse(json) as ServiceAccountCreds
    return { client_email: parsed.client_email, private_key: parsed.private_key }
  }
  const email = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !key) {
    throw new Error(
      'Google Play service account not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or the EMAIL/PRIVATE_KEY pair.'
    )
  }
  // Env vars commonly have \n escaped — normalise to real newlines.
  return { client_email: email, private_key: key.replace(/\\n/g, '\n') }
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const { client_email, private_key } = loadCreds()
  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(private_key, 'RS256')

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setSubject(client_email)
    .sign(key)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google OAuth token exchange failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

export type PlaySubscriptionV2 = {
  kind: string
  regionCode: string
  lineItems: Array<{
    productId: string
    expiryTime: string
    autoRenewingPlan?: { autoRenewEnabled: boolean }
  }>
  startTime: string
  subscriptionState:
    | 'SUBSCRIPTION_STATE_UNSPECIFIED'
    | 'SUBSCRIPTION_STATE_PENDING'
    | 'SUBSCRIPTION_STATE_ACTIVE'
    | 'SUBSCRIPTION_STATE_PAUSED'
    | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
    | 'SUBSCRIPTION_STATE_ON_HOLD'
    | 'SUBSCRIPTION_STATE_CANCELED'
    | 'SUBSCRIPTION_STATE_EXPIRED'
  latestOrderId: string
  acknowledgementState: 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED' | 'ACKNOWLEDGEMENT_STATE_PENDING' | 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
}

/**
 * Fetch the current state of a subscription purchase from Google Play.
 * https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
 */
export async function getSubscriptionPurchase(
  packageName: string,
  purchaseToken: string
): Promise<PlaySubscriptionV2> {
  const token = await getAccessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
    packageName
  )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Play subscriptionsv2.get failed: ${res.status} ${text}`)
  }
  return (await res.json()) as PlaySubscriptionV2
}

/**
 * Acknowledge a subscription purchase. Required within 3 days or Google
 * auto-refunds and revokes the subscription.
 * https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge
 */
export async function acknowledgeSubscription(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<void> {
  const token = await getAccessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
    packageName
  )}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(
    purchaseToken
  )}:acknowledge`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!res.ok && res.status !== 409 /* already acknowledged */) {
    const text = await res.text()
    throw new Error(`Play subscription acknowledge failed: ${res.status} ${text}`)
  }
}
