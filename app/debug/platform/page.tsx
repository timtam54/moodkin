import { cookies, headers } from 'next/headers'
import {
  PLATFORM_COOKIE_NAME,
  ANDROID_REFERER_PREFIX,
  ANDROID_QUERY_PARAM,
  ANDROID_QUERY_VALUE,
  detectPlatformFromRequest,
  verifyPlatformCookie,
  type Platform,
} from '@/lib/platform/cookie'

export const dynamic = 'force-dynamic'

export default async function PlatformDebugPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const h = await headers()
  const c = await cookies()
  const sp = await searchParams

  const ua = h.get('user-agent') ?? ''
  const referer = h.get('referer') ?? ''
  const host = h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') query.set(k, v)
    else if (Array.isArray(v) && v[0]) query.set(k, v[0])
  }
  const url = new URL(`${proto}://${host}/debug/platform?${query.toString()}`)

  const refererMatches = referer.startsWith(ANDROID_REFERER_PREFIX)
  const queryMatches = url.searchParams.get(ANDROID_QUERY_PARAM) === ANDROID_QUERY_VALUE
  const requestPlatform = detectPlatformFromRequest({ referer, url })

  const secret = process.env.PLATFORM_COOKIE_SECRET
  const rawCookie = c.get(PLATFORM_COOKIE_NAME)?.value
  const cookiePlatform: Platform | null = secret
    ? await verifyPlatformCookie(rawCookie, secret)
    : null

  const finalPlatform: Platform = cookiePlatform ?? requestPlatform
  const isAndroid = finalPlatform === 'android-app'

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: isAndroid ? '#0f766e' : '#7c2d12',
          color: 'white',
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        PLATFORM: {finalPlatform}
      </div>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Signal 1 — Referer header</h2>
      <pre style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, overflowX: 'auto', fontSize: 12 }}>
        {referer || '(no referer header)'}
      </pre>
      <p>
        Starts with <code>{ANDROID_REFERER_PREFIX}</code>:{' '}
        <strong>{refererMatches ? 'YES' : 'no'}</strong>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Signal 2 — Query param</h2>
      <p>
        <code>?{ANDROID_QUERY_PARAM}={ANDROID_QUERY_VALUE}</code> on this URL:{' '}
        <strong>{queryMatches ? 'YES' : 'no'}</strong>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Cookie</h2>
      <p>
        <code>{PLATFORM_COOKIE_NAME}</code> present: <strong>{rawCookie ? 'YES' : 'no'}</strong>
      </p>
      {rawCookie && (
        <pre style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, overflowX: 'auto', fontSize: 12 }}>
          {rawCookie}
        </pre>
      )}
      <p>
        HMAC verified platform:{' '}
        <strong>
          {secret
            ? cookiePlatform === null
              ? rawCookie
                ? 'INVALID (tampered or wrong secret)'
                : 'no cookie yet'
              : cookiePlatform
            : 'PLATFORM_COOKIE_SECRET not set on server'}
        </strong>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>User-Agent (informational)</h2>
      <pre style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, overflowX: 'auto', fontSize: 12 }}>
        {ua || '(no user-agent header)'}
      </pre>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>What this means</h2>
      <ul style={{ lineHeight: 1.6 }}>
        <li>
          Cold-launch the TWA from the launcher icon → Signal 1 should be YES on the first request.
        </li>
        <li>
          If you navigated here from inside the app (e.g. typed the URL into an internal link) →
          Signal 1 will likely be empty, but the cookie should already be set from the initial page
          load.
        </li>
        <li>
          If final platform is <code>web</code> while you&apos;re inside the TWA → the initial load
          didn&apos;t hit middleware (rare; possible if middleware matcher is excluding this route)
          or <code>PLATFORM_COOKIE_SECRET</code> is unset on the server.
        </li>
        <li>
          Reset the cookie in devtools if you want to re-test the initial-detection path.
        </li>
      </ul>
    </main>
  )
}
