import { NextResponse, type NextRequest } from 'next/server'
import {
  PLATFORM_COOKIE_NAME,
  detectPlatformFromRequest,
  signPlatformCookie,
  verifyPlatformCookie,
} from '@/lib/platform/cookie'

export async function middleware(request: NextRequest) {
  const secret = process.env.PLATFORM_COOKIE_SECRET
  if (!secret) return NextResponse.next()

  const detected = detectPlatformFromRequest({
    referer: request.headers.get('referer'),
    url: request.nextUrl,
  })

  const existing = request.cookies.get(PLATFORM_COOKIE_NAME)?.value
  const verified = await verifyPlatformCookie(existing, secret)

  // Sticky: once we've marked a session as android-app, never downgrade.
  // Same-origin navigations within the TWA don't carry the android-app://
  // referer, so a naive "always overwrite" would flip us back to web on the
  // second page load. The upgrade path (web → android-app) still fires
  // whenever either signal is present.
  const shouldWrite = detected === 'android-app' && verified !== 'android-app'
  const shouldInitialize = verified === null

  if (!shouldWrite && !shouldInitialize) return NextResponse.next()

  const platformToSet = shouldWrite ? 'android-app' : detected
  const response = NextResponse.next()
  const signed = await signPlatformCookie(platformToSet, secret)
  response.cookies.set(PLATFORM_COOKIE_NAME, signed, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons-pwa/|sw.js|.well-known/).*)',
  ],
}
