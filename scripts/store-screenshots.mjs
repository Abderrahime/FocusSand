// Composes the popup screenshots into 1280x800 Chrome Web Store images:
// soft branded background + centered popup with rounded corners & shadow + caption.
// Save the source popups in store/ then run:  node scripts/store-screenshots.mjs
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inDir = resolve(root, 'store');
const outDir = resolve(root, 'store/out');
mkdirSync(outDir, { recursive: true });

const W = 1280, H = 800;

// [source file in store/, caption]
const SHOTS = [
  ['active.png', 'Un sablier visuel qui vous garde concentré'],
  ['today.png', "Vos tâches du jour, en un coup d'oeil"],
  ['addtask.png', 'Estimez la durée, la priorité et la catégorie'],
  ['garden.png', 'Un jardin qui pousse à chaque tâche terminée'],
  ['float.png', 'Gardez le minuteur visible pendant que vous travaillez'],
];

const esc = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function backgroundSvg(caption) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#edeefe"/><stop offset="1" stop-color="#f5f5f3"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.02" r="0.85">
        <stop offset="0" stop-color="#6366f1" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <text x="${W / 2}" y="96" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="44" font-weight="800" fill="#0f1019" letter-spacing="-1">FocusSand</text>
    <text x="${W / 2}" y="146" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="25" font-weight="500" fill="#51525e">${esc(caption)}</text>
  </svg>`);
}

let made = 0;
for (const [file, caption] of SHOTS) {
  const srcPath = resolve(inDir, file);
  if (!existsSync(srcPath)) {
    console.log(`· ignoré (absent) : store/${file}`);
    continue;
  }

  const targetH = 600;
  const popup = await sharp(srcPath).resize({ height: targetH }).png().toBuffer();
  const pm = await sharp(popup).metadata();
  const radius = 22;

  // Rounded corners on the popup.
  const mask = Buffer.from(`<svg width="${pm.width}" height="${pm.height}"><rect width="${pm.width}" height="${pm.height}" rx="${radius}" ry="${radius}"/></svg>`);
  const rounded = await sharp(popup).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

  // Soft drop shadow.
  const pad = 48;
  const shadow = await sharp({ create: { width: pm.width + pad * 2, height: pm.height + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${pm.width + pad * 2}" height="${pm.height + pad * 2}"><rect x="${pad}" y="${pad + 10}" width="${pm.width}" height="${pm.height}" rx="${radius}" fill="black" fill-opacity="0.30"/></svg>`) }])
    .blur(22).png().toBuffer();

  const x = Math.round((W - pm.width) / 2);
  const y = Math.round(176 + (H - 176 - pm.height) / 2);

  const bg = await sharp(backgroundSvg(caption)).png().toBuffer();
  const out = resolve(outDir, file.replace(/\.png$/i, '-1280x800.png'));
  await sharp(bg)
    .composite([
      { input: shadow, left: x - pad, top: y - pad },
      { input: rounded, left: x, top: y },
    ])
    .flatten({ background: '#f5f5f3' }) // 24-bit, no alpha (Web Store requirement)
    .png()
    .toFile(out);
  console.log(`✓ ${out}`);
  made++;
}

console.log(made ? `\n${made} capture(s) générée(s) dans store/out/` : '\nAucune source trouvée. Enregistrez vos captures dans store/ (voir les noms attendus).');
