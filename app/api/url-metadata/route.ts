import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'

interface UrlMetadata {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

function extractMetaContent(html: string, property: string): string | null {
  // Normalize HTML - replace newlines and multiple spaces for easier matching
  const normalizedHtml = html.replace(/\s+/g, ' ')

  // Try og: tags first (property before content)
  const ogRegex = new RegExp(`<meta[^>]*property\\s*=\\s*["']og:${property}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, 'i')
  const ogMatch = normalizedHtml.match(ogRegex)
  if (ogMatch) return ogMatch[1]

  // Try reverse order (content before property)
  const ogReverseRegex = new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*property\\s*=\\s*["']og:${property}["']`, 'i')
  const ogReverseMatch = normalizedHtml.match(ogReverseRegex)
  if (ogReverseMatch) return ogReverseMatch[1]

  // Try twitter: tags (name before content)
  const twitterRegex = new RegExp(`<meta[^>]*name\\s*=\\s*["']twitter:${property}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, 'i')
  const twitterMatch = normalizedHtml.match(twitterRegex)
  if (twitterMatch) return twitterMatch[1]

  // Try twitter: tags reverse order (content before name)
  const twitterReverseRegex = new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*name\\s*=\\s*["']twitter:${property}["']`, 'i')
  const twitterReverseMatch = normalizedHtml.match(twitterReverseRegex)
  if (twitterReverseMatch) return twitterReverseMatch[1]

  // Try itemprop for image (used by some sites like Pinterest)
  if (property === 'image') {
    const itempropRegex = /<meta[^>]*itemprop\s*=\s*["']image["'][^>]*content\s*=\s*["']([^"']*)["']/i
    const itempropMatch = normalizedHtml.match(itempropRegex)
    if (itempropMatch) return itempropMatch[1]

    // Try reverse order
    const itempropReverseRegex = /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*itemprop\s*=\s*["']image["']/i
    const itempropReverseMatch = normalizedHtml.match(itempropReverseRegex)
    if (itempropReverseMatch) return itempropReverseMatch[1]

    // Try link rel="image_src" (older style)
    const linkImageRegex = /<link[^>]*rel\s*=\s*["']image_src["'][^>]*href\s*=\s*["']([^"']*)["']/i
    const linkImageMatch = normalizedHtml.match(linkImageRegex)
    if (linkImageMatch) return linkImageMatch[1]
  }

  // Try regular meta tags for title/description
  if (property === 'title') {
    const titleRegex = /<title[^>]*>([^<]*)<\/title>/i
    const titleMatch = normalizedHtml.match(titleRegex)
    if (titleMatch) return titleMatch[1].trim()
  }

  if (property === 'description') {
    const descRegex = /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i
    const descMatch = normalizedHtml.match(descRegex)
    if (descMatch) return descMatch[1]

    // Try reverse order
    const descReverseRegex = /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["']/i
    const descReverseMatch = normalizedHtml.match(descReverseRegex)
    if (descReverseMatch) return descReverseMatch[1]
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
      console.log('URL metadata - HTML length:', html.length, 'for URL:', url)

      const metadata: UrlMetadata = {
        title: extractMetaContent(html, 'title'),
        description: extractMetaContent(html, 'description'),
        image: extractMetaContent(html, 'image'),
        siteName: extractMetaContent(html, 'site_name') || new URL(url).hostname,
      }

      console.log('URL metadata - Extracted:', JSON.stringify(metadata))

      // Debug: log if we found any og:image or twitter:image in the raw HTML
      if (!metadata.image) {
        const hasOgImage = html.toLowerCase().includes('og:image')
        const hasTwitterImage = html.toLowerCase().includes('twitter:image')
        console.log('URL metadata - No image found. og:image present:', hasOgImage, 'twitter:image present:', hasTwitterImage)
        // Log a snippet around og:image if present
        if (hasOgImage) {
          const ogIndex = html.toLowerCase().indexOf('og:image')
          console.log('URL metadata - og:image context:', html.substring(Math.max(0, ogIndex - 50), ogIndex + 200))
        }
      }

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
