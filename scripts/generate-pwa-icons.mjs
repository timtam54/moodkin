import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = './public/icons'

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Create SVG with infinity symbol on dark background
function createIconSvg(size) {
  // Scale the infinity symbol to fit nicely within the icon
  // Leave padding for maskable safe zone (about 10% on each side)
  const padding = size * 0.15
  const symbolWidth = size - padding * 2
  const symbolHeight = symbolWidth * 0.5 // Infinity is roughly 2:1 ratio
  const strokeWidth = Math.max(size * 0.08, 4)

  const centerX = size / 2
  const centerY = size / 2

  // Calculate control points for the infinity symbol
  const halfWidth = symbolWidth / 2
  const halfHeight = symbolHeight / 2

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#1a1a1a"/>
      <path
        d="M ${centerX} ${centerY}
           C ${centerX} ${centerY - halfHeight},
             ${centerX + halfWidth * 0.6} ${centerY - halfHeight},
             ${centerX + halfWidth * 0.6} ${centerY}
           C ${centerX + halfWidth * 0.6} ${centerY + halfHeight},
             ${centerX} ${centerY + halfHeight},
             ${centerX} ${centerY}
           C ${centerX} ${centerY - halfHeight},
             ${centerX - halfWidth * 0.6} ${centerY - halfHeight},
             ${centerX - halfWidth * 0.6} ${centerY}
           C ${centerX - halfWidth * 0.6} ${centerY + halfHeight},
             ${centerX} ${centerY + halfHeight},
             ${centerX} ${centerY}"
        fill="none"
        stroke="#F5C547"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `
}

async function generateIcons() {
  console.log('Generating PWA icons...')

  for (const size of sizes) {
    const svg = createIconSvg(size)
    const outputPath = path.join(outputDir, `icon-${size}.png`)

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath)

    console.log(`Generated: icon-${size}.png`)
  }

  console.log('Done!')
}

generateIcons().catch(console.error)
