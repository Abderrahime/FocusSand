import { useEffect, useRef } from 'react';
import { formatDuration } from '@/utils/time';
import type { SandPack } from '@/models/settings';

interface Props {
  elapsedSeconds: number;
  estimatedSeconds: number;
  paused?: boolean;
  sandPack?: SandPack;
  /**
   * Render the glass for a dark surface (subtler body, darker wood, dimmer
   * specular). When omitted, the renderer reads `data-theme` from the
   * document each frame, so it tracks the live theme automatically.
   */
  dark?: boolean;
}

/**
 * Hourglass V3 — pure canvas, ported from Claude Design's prototype.
 *
 *  - Chamber walls are quadratic/Bezier curves that bulge outward like
 *    real blown glass.
 *  - Halo radial gradient sits behind the glass (pack-tinted).
 *  - Specular streak slides slowly across the body for a "polished glass"
 *    feeling.
 *  - Sand surface in the top chamber is concave (funnels into the neck);
 *    pile in the bottom chamber is a bombé dome.
 *  - Grains fall with gravity; each impact spawns a half-arc splash.
 *  - "Shiftable" packs (classic / gold) automatically warm toward orange,
 *    then red, as remaining time drops below 50 % then 18 %.
 *  - Sound-reactive tremor: 260 ms shake on each `focusand:sound` event
 *    (silent for the "click" type to avoid noise).
 */

interface Grain {
  x: number;
  y: number;
  vy: number;
  r: number;
}

interface Splash {
  x: number;
  y: number;
  r: number;
  a: number;
}

interface Sparkle {
  x: number; // 0..1
  y: number; // 0..1
  ph: number;
}

interface PropsSnapshot {
  progress: number;
  remaining: number;
  running: boolean;
  pack: SandPack;
  /** Explicit theme override; when undefined the renderer reads the DOM. */
  dark?: boolean;
}

interface Pack {
  hi: string;
  lo: string;
  grain: string;
  glow: string;
  shiftable?: boolean;
  emissive?: boolean;
  /** Glowing ancient runes float in the chambers (night "wow" variant). */
  runes?: boolean;
}

const PACKS: Record<SandPack, Pack> = {
  classic: { hi: '#f6c563', lo: '#e08a2a', grain: '#f3b24d', glow: 'rgba(240,168,48,.45)', shiftable: true },
  lava:    { hi: '#ff8a3d', lo: '#d62828', grain: '#ff6b35', glow: 'rgba(255,90,40,.55)',  emissive: true },
  glacier: { hi: '#dff1fb', lo: '#9bc7e6', grain: '#c4e4f5', glow: 'rgba(150,200,235,.5)' },
  emerald: { hi: '#6ee7b7', lo: '#0f9d6b', grain: '#34d399', glow: 'rgba(52,211,153,.5)' },
  gold:    { hi: '#ffe9a8', lo: '#cda03a', grain: '#ecc758', glow: 'rgba(230,196,80,.55)', emissive: true },
  rune:    { hi: '#c3ccff', lo: '#6b74d6', grain: '#aab4ff', glow: 'rgba(130,140,255,.6)', runes: true, emissive: true },
};

// Ancient runes drawn in the rune pack chambers.
const RUNES = ['ᚠ', 'ᚱ', 'ᛟ', 'ᚦ', 'ᛉ', 'ᛞ', 'ᚷ', 'ᛊ'];

// Re-exported for the SettingsDialog sand-pack picker.
export const SAND_PACK_LABELS: Record<SandPack, { label: string; sample: string }> = {
  classic: { label: 'Classique', sample: PACKS.classic.grain },
  lava:    { label: 'Lave',      sample: PACKS.lava.grain },
  glacier: { label: 'Glacier',   sample: PACKS.glacier.grain },
  emerald: { label: 'Émeraude',  sample: PACKS.emerald.grain },
  gold:    { label: 'Or',        sample: PACKS.gold.grain },
  rune:    { label: 'Rune',      sample: PACKS.rune.grain },
};

const CANVAS_W = 188;
const CANVAS_H = 204;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(h1: string, h2: string, t: number): string {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

interface CanvasProps {
  /** Fraction of sand already fallen (0..1). */
  progress: number;
  /** Fraction of time remaining (0..1) — drives the amber→red shift. */
  remaining: number;
  /** When true, grains fall and sparkles twinkle. */
  running: boolean;
  pack: SandPack;
  /** Explicit theme; falls back to the live document theme when omitted. */
  dark?: boolean;
  /** CSS pixel size of the canvas. */
  width: number;
  height: number;
  className?: string;
}

/**
 * Low-level canvas renderer for the V3 hourglass. Drives the animation loop
 * directly from props, with no readout chrome — reused both as the hero timer
 * (188×204) and as the tiny header logo mark (30×38), matching Claude Design.
 */
export function HourglassCanvas({ progress, remaining, running, pack, dark, width, height, className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const grainsRef = useRef<Grain[]>([]);
  const splashesRef = useRef<Splash[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const spawnAccRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(performance.now());
  const shakeUntilRef = useRef<number>(0);
  const propsRef = useRef<PropsSnapshot>({ progress, remaining, running, pack, dark });

  // Sync prop snapshot every render.
  useEffect(() => {
    propsRef.current = { progress, remaining, running, pack, dark };
  }, [progress, remaining, running, pack, dark]);

  // Sound-reactive shake: a 260 ms tremor on each non-click sound event.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ name: string }>;
      if (!ce.detail || ce.detail.name === 'click') return;
      shakeUntilRef.current = performance.now() + 260;
    };
    window.addEventListener('focusand:sound', handler);
    return () => window.removeEventListener('focusand:sound', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Seed sparkles once.
    if (sparklesRef.current.length === 0) {
      for (let i = 0; i < 7; i++) {
        sparklesRef.current.push({
          x: Math.random(),
          y: Math.random(),
          ph: Math.random() * Math.PI * 2,
        });
      }
    }

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    lastFrameRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const { w, h } = sizeCanvas();
      ctx.clearRect(0, 0, w, h);

      let sx = 0;
      let sy = 0;
      if (now < shakeUntilRef.current) {
        const k = (shakeUntilRef.current - now) / 260;
        sx = Math.sin(now / 16) * 3 * k;
        sy = Math.cos(now / 13) * 2 * k;
      }
      // Explicit prop wins; otherwise track the live document theme.
      const isDark = propsRef.current.dark ?? document.documentElement.dataset.theme === 'dark';

      ctx.save();
      ctx.translate(sx, sy);
      renderGlass(ctx, w, h, propsRef.current, now, dt, grainsRef.current, splashesRef.current, sparklesRef.current, spawnAccRef, isDark);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas ref={canvasRef} className={className} style={{ width, height }} aria-hidden />
  );
}

export function Hourglass({ elapsedSeconds, estimatedSeconds, paused = false, sandPack = 'classic', dark }: Props) {
  const safeEstimated = Math.max(1, estimatedSeconds);
  const rawProgress = elapsedSeconds / safeEstimated;
  const overrun = rawProgress > 1;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const remaining = Math.max(0, Math.min(1, 1 - rawProgress));
  const tone: 'amber' | 'orange' | 'red' = overrun
    ? 'red'
    : remaining <= 0.25
      ? 'orange'
      : 'amber';
  const remainingDisplay = overrun ? -(elapsedSeconds - safeEstimated) : safeEstimated - elapsedSeconds;
  const percent = Math.round(rawProgress * 100);

  return (
    <div className={`hourglass tone-${tone} ${paused ? 'is-paused' : ''} ${overrun ? 'is-overrun' : ''}`}>
      <HourglassCanvas
        className="hourglass__canvas"
        progress={progress}
        remaining={remaining}
        running={!paused}
        pack={sandPack}
        dark={dark}
        width={CANVAS_W}
        height={CANVAS_H}
      />
      <div className="hourglass__readout">
        <div className="hourglass__time">{formatDuration(remainingDisplay)}</div>
        <div className="hourglass__label">
          {paused ? 'En pause' : overrun ? 'Temps dépassé' : `${percent}% écoulé`}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Canvas drawing
// =====================================================================

interface Geometry {
  cx: number;
  top: number;
  bot: number;
  neck: number;
  halfW: number;
  neckW: number;
  capH: number;
  padX: number;
}

function geo(w: number, h: number): Geometry {
  const cx = w / 2;
  const padX = w * 0.16;
  const padY = h * 0.085;
  const top = padY;
  const bot = h - padY;
  const neck = (top + bot) / 2;
  const halfW = (w / 2) - padX;
  const neckW = w * 0.030;
  const capH = h * 0.045;
  return { cx, top, bot, neck, halfW, neckW, capH, padX };
}

function chamberPath(ctx: CanvasRenderingContext2D, g: Geometry, dir: -1 | 1): void {
  const { cx, neck, halfW, neckW } = g;
  const edgeY = dir < 0 ? g.top + g.capH * 0.5 : g.bot - g.capH * 0.5;
  const bulge = halfW * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx - neckW, neck);
  ctx.bezierCurveTo(
    cx - neckW - bulge, neck + dir * (Math.abs(edgeY - neck) * 0.30),
    cx - halfW + bulge * 0.4, edgeY - dir * (Math.abs(edgeY - neck) * 0.34),
    cx - halfW, edgeY,
  );
  ctx.lineTo(cx + halfW, edgeY);
  ctx.bezierCurveTo(
    cx + halfW - bulge * 0.4, edgeY - dir * (Math.abs(edgeY - neck) * 0.34),
    cx + neckW + bulge, neck + dir * (Math.abs(edgeY - neck) * 0.30),
    cx + neckW, neck,
  );
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWood(ctx: CanvasRenderingContext2D, g: Geometry, y: number, dark: boolean): void {
  const x = g.cx - g.halfW - g.padX * 0.35;
  const ww = (g.halfW + g.padX * 0.35) * 2;
  const r = g.capH * 0.5;
  const grad = ctx.createLinearGradient(0, y, 0, y + g.capH);
  if (dark) {
    grad.addColorStop(0, '#6b5536');
    grad.addColorStop(0.5, '#4f3f28');
    grad.addColorStop(1, '#372c1c');
  } else {
    grad.addColorStop(0, '#a9824f');
    grad.addColorStop(0.45, '#8a6437');
    grad.addColorStop(1, '#6e4f2c');
  }
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, ww, g.capH, r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  roundRect(ctx, x + 3, y + 2, ww - 6, g.capH * 0.28, r * 0.6);
  ctx.fill();
}

function renderGlass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: PropsSnapshot,
  now: number,
  dt: number,
  grains: Grain[],
  splashes: Splash[],
  sparkles: Sparkle[],
  spawnAccRef: { current: number },
  dark: boolean,
): void {
  const g = geo(w, h);
  const basePack = PACKS[s.pack] ?? PACKS.classic;
  const progress = s.progress;
  const remaining = s.remaining;

  // Auto color shift for shiftable packs.
  let hi = basePack.hi;
  let lo = basePack.lo;
  let grainCol = basePack.grain;
  if (basePack.shiftable) {
    if (remaining < 0.5) {
      const t = 1 - remaining / 0.5;
      hi = mixHex(basePack.hi, '#ff8a3d', t);
      lo = mixHex(basePack.lo, '#cf3a1a', t);
      grainCol = mixHex(basePack.grain, '#ff6b35', t);
    }
    if (remaining < 0.18) {
      const t = 1 - remaining / 0.18;
      hi = mixHex('#ff8a3d', '#ff5b5b', t);
      lo = mixHex('#cf3a1a', '#c81e1e', t);
      grainCol = mixHex('#ff6b35', '#ef4444', t);
    }
  }

  // Halo behind the glass.
  const halo = ctx.createRadialGradient(g.cx, h / 2, h * 0.05, g.cx, h / 2, h * 0.52);
  halo.addColorStop(0, basePack.glow);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = basePack.emissive ? 0.9 : 0.55;
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // Glass body (translucent fill).
  const bodyGrad = ctx.createLinearGradient(g.cx - g.halfW, 0, g.cx + g.halfW, 0);
  if (dark) {
    bodyGrad.addColorStop(0, 'rgba(255,255,255,.10)');
    bodyGrad.addColorStop(0.5, 'rgba(255,255,255,.02)');
    bodyGrad.addColorStop(1, 'rgba(255,255,255,.06)');
  } else {
    bodyGrad.addColorStop(0, 'rgba(255,255,255,.55)');
    bodyGrad.addColorStop(0.45, 'rgba(214,224,238,.18)');
    bodyGrad.addColorStop(1, 'rgba(150,165,190,.22)');
  }
  ctx.save();
  chamberPath(ctx, g, -1);
  chamberPath(ctx, g, 1);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.restore();

  // Top chamber sand (concave surface).
  ctx.save();
  chamberPath(ctx, g, -1);
  ctx.clip();
  const topH = Math.abs(g.neck - (g.top + g.capH * 0.5));
  const surfY = (g.top + g.capH * 0.5) + topH * (1 - remaining) * 0.92;
  const sg = ctx.createLinearGradient(0, surfY, 0, g.neck);
  sg.addColorStop(0, hi);
  sg.addColorStop(1, lo);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.halfW, surfY + g.halfW * 0.10);
  ctx.quadraticCurveTo(g.cx, surfY + g.halfW * 0.34, g.cx + g.halfW, surfY + g.halfW * 0.10);
  ctx.lineTo(g.cx + g.neckW, g.neck);
  ctx.lineTo(g.cx - g.neckW, g.neck);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.halfW, surfY + g.halfW * 0.10);
  ctx.quadraticCurveTo(g.cx, surfY + g.halfW * 0.34, g.cx + g.halfW, surfY + g.halfW * 0.10);
  ctx.stroke();
  // Sparkles in the top chamber.
  if (remaining > 0.04) {
    for (const sp of sparkles) {
      const tw = 0.5 + 0.5 * Math.sin(now / 380 + sp.ph);
      const px = g.cx + (sp.x - 0.5) * g.halfW * 1.4;
      const py = lerp(surfY + 8, g.neck - 6, sp.y);
      if (py > surfY + 4) {
        ctx.globalAlpha = 0.15 + tw * 0.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, 0.9 + tw * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Bottom pile (bombé dome).
  ctx.save();
  chamberPath(ctx, g, 1);
  ctx.clip();
  const botH = Math.abs((g.bot - g.capH * 0.5) - g.neck);
  const baseY = g.bot - g.capH * 0.5;
  const pileH = botH * (0.18 + progress * 0.80);
  const pileTop = baseY - pileH;
  const pileGrad = ctx.createLinearGradient(0, pileTop, 0, baseY);
  pileGrad.addColorStop(0, hi);
  pileGrad.addColorStop(1, lo);
  ctx.fillStyle = pileGrad;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.halfW, baseY + 2);
  ctx.lineTo(g.cx - g.halfW, pileTop + pileH * 0.4);
  ctx.quadraticCurveTo(g.cx, pileTop - pileH * 0.25, g.cx + g.halfW, pileTop + pileH * 0.4);
  ctx.lineTo(g.cx + g.halfW, baseY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.30)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(g.cx - g.halfW, pileTop + pileH * 0.4);
  ctx.quadraticCurveTo(g.cx, pileTop - pileH * 0.25, g.cx + g.halfW, pileTop + pileH * 0.4);
  ctx.stroke();
  ctx.restore();

  // Falling grain particles.
  const empty = remaining <= 0.003;
  if (s.running && !empty) {
    spawnAccRef.current += dt * 120;
    while (spawnAccRef.current > 1) {
      spawnAccRef.current -= 1;
      grains.push({
        x: g.cx + (Math.random() - 0.5) * g.neckW * 1.1,
        y: g.neck,
        vy: 30 + Math.random() * 20,
        r: 1.0 + Math.random() * 1.1,
      });
    }
  }
  const pileSurfaceY = baseY - pileH;
  ctx.fillStyle = grainCol;
  for (let i = grains.length - 1; i >= 0; i--) {
    const gr = grains[i];
    gr.vy += 520 * dt;
    gr.y += gr.vy * dt;
    if (gr.y >= pileSurfaceY) {
      splashes.push({ x: gr.x, y: pileSurfaceY, r: 1, a: 0.5 });
      grains.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(gr.x, gr.y, gr.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Splash half-arcs at impact.
  for (let i = splashes.length - 1; i >= 0; i--) {
    const sp = splashes[i];
    sp.r += 60 * dt;
    sp.a -= 2.4 * dt;
    if (sp.a <= 0) {
      splashes.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = sp.a;
    ctx.strokeStyle = grainCol;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.r, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Glass outline + specular streak (moves slowly).
  ctx.save();
  chamberPath(ctx, g, -1);
  chamberPath(ctx, g, 1);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = dark ? 'rgba(160,170,205,.45)' : 'rgba(120,135,165,.5)';
  ctx.stroke();
  ctx.clip();
  const shift = Math.sin(now / 2600) * w * 0.02;
  const spec = ctx.createLinearGradient(g.cx - g.halfW * 0.7 + shift, 0, g.cx - g.halfW * 0.3 + shift, 0);
  spec.addColorStop(0, 'rgba(255,255,255,0)');
  spec.addColorStop(0.5, dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.6)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(0, 0, w, h);
  const spec2 = ctx.createLinearGradient(g.cx + g.halfW * 0.55, 0, g.cx + g.halfW, 0);
  spec2.addColorStop(0, 'rgba(255,255,255,0)');
  spec2.addColorStop(1, dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.32)');
  ctx.fillStyle = spec2;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Neck ring (small glass collar).
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(170,180,215,.5)' : 'rgba(120,135,165,.55)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(g.cx - g.neckW, g.neck - g.neckW * 1.2, g.neckW * 2, g.neckW * 2.4);
  ctx.restore();

  // Glowing ancient runes (rune pack only — night "wow" variant).
  if (basePack.runes) {
    ctx.save();
    ctx.font = `${Math.round(w * 0.05)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = basePack.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(180,190,255,.92)';
    const pulse = 0.6 + 0.4 * Math.sin(now / 600);
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    const yTopC = lerp(g.top + g.capH, g.neck, 0.42);
    const yBotC = lerp(g.neck, g.bot - g.capH, 0.58);
    ctx.fillText(RUNES[0], g.cx - g.halfW * 0.55, yTopC);
    ctx.fillText(RUNES[3], g.cx + g.halfW * 0.55, yTopC);
    ctx.fillText(RUNES[5], g.cx - g.halfW * 0.55, yBotC);
    ctx.fillText(RUNES[6], g.cx + g.halfW * 0.55, yBotC);
    ctx.restore();
  }

  // Wood caps.
  drawWood(ctx, g, g.top, dark);
  drawWood(ctx, g, g.bot - g.capH, dark);
}
