// Rasterises public/icon.svg into the PNG sizes installable PWAs need.
// Run with `npm run icons` after changing the source mark; the PNGs are committed,
// so CI never has to run sharp.
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const SRC = 'public/icon.svg'
const svg = readFileSync(SRC)

// Android masks icons to a circle/squircle and crops roughly the outer 10% on each
// side, so a maskable icon has to keep its mark inside the central 80%.
const MASKABLE_SAFE = 0.8
const BACKGROUND = '#047857'

async function plain(size, out) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out)
  return `${out} (${size}x${size})`
}

async function maskable(size, out) {
  const inner = Math.round(size * MASKABLE_SAFE)
  const pad = Math.round((size - inner) / 2)
  const mark = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mark, top: pad, left: pad }])
    .png()
    .toFile(out)
  return `${out} (${size}x${size}, maskable)`
}

await mkdir('public', { recursive: true })

const made = await Promise.all([
  plain(192, 'public/pwa-192.png'),
  plain(512, 'public/pwa-512.png'),
  plain(180, 'public/apple-touch-icon.png'),
  maskable(512, 'public/pwa-maskable-512.png'),
])

// A 32px favicon still beats an SVG one in a few browsers and costs nothing.
made.push(await plain(32, 'public/favicon-32.png'))

await writeFile('public/.icons-generated', made.join('\n') + '\n')
console.log(made.join('\n'))
