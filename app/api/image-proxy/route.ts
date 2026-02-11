import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the image with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*',
        },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const buffer = await response.arrayBuffer()

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Image proxy fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
