// Generates Chrome icon PNGs from a source raster image.
// Crops to a centered square, then resizes to each size.
// Usage: node scripts/icons-from-image.mjs store/icon-source.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, process.argv[2] ?? 'store/icon-source.png');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];

const meta = await sharp(src).metadata();
const side = Math.min(meta.width, meta.height);
const left = Math.floor((meta.width - side) / 2);
const top = Math.floor((meta.height - side) / 2);
console.log(`Source ${meta.width}x${meta.height} → square crop ${side}x${side}`);

for (const size of SIZES) {
  const out = resolve(outDir, `icon-${size}.png`);
  await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(out);
  console.log(`✓ ${out}`);
}
console.log('Done.');
