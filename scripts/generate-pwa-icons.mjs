import sharp from 'sharp'
import path from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = './public/icons-pwa'
const sourceIcon = './public/icons/icon-512.png'

async function generateIcons() {
  console.log('Generating PWA icons with white background...')

  // Create output directory
  const fs = await import('fs')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`)

    // Create white background and composite the original icon on top
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([
        {
          input: await sharp(sourceIcon)
            .resize(size, size)
            .toBuffer(),
          blend: 'over'
        }
      ])
      .png()
      .toFile(outputPath)

    console.log(`Generated: ${outputPath}`)
  }

  console.log('Done!')
}

generateIcons().catch(console.error)
