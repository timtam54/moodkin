import { Vibrant } from 'node-vibrant/node'

/**
 * Extract dominant colors from an image URL
 * Returns an array of hex color strings (up to 6 colors)
 */
export async function extractColorsFromUrl(imageUrl: string): Promise<string[]> {
  try {
    const palette = await new Vibrant(imageUrl).getPalette()

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
