import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'

interface UrlMetadata {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

function extractMetaContent(html: string, property: string): string | null {
  // Try og: tags first
  const ogRegex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i')
  const ogMatch = html.match(ogRegex)
  if (ogMatch) return ogMatch[1]

  // Try reverse order (content before property)
  const ogReverseRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i')
  const ogReverseMatch = html.match(ogReverseRegex)
  if (ogReverseMatch) return ogReverseMatch[1]

  // Try twitter: tags
  const twitterRegex = new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i')
  const twitterMatch = html.match(twitterRegex)
  if (twitterMatch) return twitterMatch[1]

  // Try regular meta tags for title/description
  if (property === 'title') {
    const titleRegex = /<title[^>]*>([^<]*)<\/title>/i
    const titleMatch = html.match(titleRegex)
    if (titleMatch) return titleMatch[1]
  }

  if (property === 'description') {
    const descRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    const descMatch = html.match(descRegex)
    if (descMatch) return descMatch[1]
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    await requireSession()

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the URL with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      })
      clearTimeout(timeoutId)

      console.log('URL metadata fetch response:', response.status, url)

      if (!response.ok) {
        console.log('URL metadata fetch failed:', response.status)
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          siteName: new URL(url).hostname,
        } as UrlMetadata)
      }

      const html = await response.text()
      console.log('HTML length:', html.length)

      const metadata: UrlMetadata = {
        title: extractMetaContent(html, 'title'),
        description: extractMetaContent(html, 'description'),
        image: extractMetaContent(html, 'image'),
        siteName: extractMetaContent(html, 'site_name') || new URL(url).hostname,
      }

      console.log('Extracted metadata:', metadata)

      // Make image URL absolute if it's relative
      if (metadata.image && !metadata.image.startsWith('http')) {
        const baseUrl = new URL(url)
        metadata.image = new URL(metadata.image, baseUrl.origin).toString()
      }

      return NextResponse.json(metadata)
    } catch (fetchError) {
      console.error('URL metadata fetch error:', fetchError)
      clearTimeout(timeoutId)
      // Return basic metadata if fetch fails
      return NextResponse.json({
        title: null,
        description: null,
        image: null,
        siteName: new URL(url).hostname,
      } as UrlMetadata)
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
