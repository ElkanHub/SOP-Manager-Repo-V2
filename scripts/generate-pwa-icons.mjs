// One-off icon generator: writes brand-colored placeholders to public/icons/.
// Replace these with real artwork before launch.
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const OUT = join(process.cwd(), "public", "icons")
await mkdir(OUT, { recursive: true })

const BRAND_NAVY = { r: 13, g: 43, b: 85, alpha: 1 }
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

function svgIcon(size, { maskable = false } = {}) {
  // Maskable safe zone = inner 80%. Keep the mark in that area.
  const inner = maskable ? size * 0.6 : size * 0.7
  const offset = (size - inner) / 2
  const r = inner / 8
  const fontSize = inner * 0.5
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="rgb(13,43,85)"/>
  <rect x="${offset}" y="${offset}" width="${inner}" height="${inner}" rx="${r}" ry="${r}" fill="rgb(13,43,85)" stroke="white" stroke-width="${size / 64}" />
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">SG</text>
</svg>
`)
}

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512]

for (const size of sizes) {
  const buf = svgIcon(size)
  const out = join(OUT, `icon-${size}x${size}.png`)
  await sharp(buf).png().toFile(out)
  console.log("wrote", out)
}

// Maskable variant of 512
const maskable = svgIcon(512, { maskable: true })
await sharp(maskable)
  .flatten({ background: BRAND_NAVY })
  .png()
  .toFile(join(OUT, "icon-maskable-512x512.png"))

// apple-touch-icon (180 alias)
await sharp(svgIcon(180))
  .png()
  .toFile(join(OUT, "apple-touch-icon.png"))

console.log("done")

void WHITE
