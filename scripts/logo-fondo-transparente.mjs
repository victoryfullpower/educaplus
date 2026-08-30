/**
 * PNG con fondo negro → transparencia; texto blanco del lema → gris legible.
 */
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const output = path.join(__dirname, '../src/assets/log_educaplus.png')
const BLACK_THRESHOLD = 42

const { data, info } = await sharp(output)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]

  if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
    data[i + 3] = 0
    continue
  }

  const isNearWhite =
    r > 230 && g > 230 && b > 230 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18
  if (isNearWhite) {
    data[i] = 71
    data[i + 1] = 85
    data[i + 2] = 105
  }
}

const tmp = output + '.tmp'
await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 }
})
  .png()
  .toFile(tmp)

fs.renameSync(tmp, output)
console.log('Logo actualizado con transparencia:', output)
