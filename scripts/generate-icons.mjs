// Rasterizes public/icon.svg into the PNG sizes Chrome needs.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public/icon.svg'));
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];

for (const size of SIZES) {
  const out = resolve(outDir, `icon-${size}.png`);
  // High density so the SVG rasterizes crisply before the final resize.
  await sharp(svg, { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`✓ ${out}`);
}

console.log('Icons generated.');
