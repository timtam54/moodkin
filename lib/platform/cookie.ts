export type Platform = 'web' | 'android-app'

export const PLATFORM_COOKIE_NAME = 'moodkin_platform'
export const ANDROID_PACKAGE_NAME = 'com.moodkinstudio.app'
export const ANDROID_REFERER_PREFIX = `android-app://${ANDROID_PACKAGE_NAME}`
export const ANDROID_QUERY_PARAM = 'platform'
export const ANDROID_QUERY_VALUE = 'android'

const encoder = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]!)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return base64UrlEncode(new Uint8Array(sig))
}

export async function signPlatformCookie(platform: Platform, secret: string): Promise<string> {
  const sig = await hmac(secret, platform)
  return `${platform}.${sig}`
}

export async function verifyPlatformCookie(
  raw: string | undefined,
  secret: string,
): Promise<Platform | null> {
  if (!raw) return null
  const dot = raw.indexOf('.')
  if (dot === -1) return null
  const platform = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (platform !== 'web' && platform !== 'android-app') return null
  const expected = await hmac(secret, platform)
  if (!timingSafeEqual(sig, expected)) return null
  return platform
}

export interface RequestSignals {
  referer: string | null | undefined
  url: URL | string
}

/**
 * Detect whether a request originated from the TWA wrapper.
 *
 * Two independent signals (either one alone is sufficient):
 *   1. `Referer: android-app://com.moodkinstudio.app` — Chrome sets this on
 *      the initial navigation from the TWA launcher. Robust across cold and
 *      warm launches.
 *   2. `?platform=android` query param — carried on the TWA's start_url. A
 *      backstop for edge cases where the referer is missing (some deep-link
 *      / notification paths).
 *
 * Custom User-Agent suffixes are NOT viable — Chrome does not let TWA hosts
 * override its UA (see GoogleChromeLabs/bubblewrap#823).
 */
export function detectPlatformFromRequest({ referer, url }: RequestSignals): Platform {
  if (referer && referer.startsWith(ANDROID_REFERER_PREFIX)) return 'android-app'
  const parsed = typeof url === 'string' ? new URL(url) : url
  if (parsed.searchParams.get(ANDROID_QUERY_PARAM) === ANDROID_QUERY_VALUE) return 'android-app'
  return 'web'
}
