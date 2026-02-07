import { Vibrant } from 'node-vibrant/node'

/**
 * Extract dominant colors from an image URL
 * Returns an array of hex color strings (up to 6 colors)
 */
export async function extractColorsFromUrl(imageUrl: string): Promise<string[]> {
  try {
    // Fetch the image as a buffer first (more reliable than passing URL directly)
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error('Failed to fetch image for color extraction:', response.status)
      return []
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const palette = await Vibrant.from(buffer).getPalette()

    const colors: string[] = []

    // Get colors in order of visual importance
    const swatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ]

    for (const swatch of swatches) {
      if (swatch) {
        colors.push(swatch.hex)
      }
    }

    return colors
  } catch (error) {
    console.error('Failed to extract colors:', error)
    return []
  }
}
