import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '@/utils/time';
import type { SandPack } from '@/models/settings';

interface Props {
  elapsedSeconds: number;
  estimatedSeconds: number;
  paused?: boolean;
  sandPack?: SandPack;
}

/**
 * Hourglass V2 with sand packs, 3D tilt, and sound-reactive tremor.
 *
 *  - SVG holds the static glass + wooden frame (sharp at any DPR).
 *  - Canvas hosts the sand: top fill, falling grains, splashes, sparkles,
 *    and a curved pile surface. Re-renders at 60 fps.
 *  - A wrapping div applies a permanent 3D tilt and briefly shakes on
 *    sound events.
 *
 * Geometry: 220 × 280 units (canvas + SVG share the system).
 *  · Top wooden cap:    y=0..22
 *  · Top chamber:       y=22..128 (200 → 0 wide)
 *  · Neck:              y=128..152 (width 14)
 *  · Bottom chamber:    y=152..258 (0 → 200 wide)
 *  · Bottom wooden cap: y=258..280
 */

const W = 220;
const H = 280;
const CX = W / 2;
const TOP_Y = 22;
const TOP_BOT_Y = 128;
const NECK_TOP_Y = 128;
const NECK_BOT_Y = 152;
const BOT_TOP_Y = 152;
const BOT_BOT_Y = 258;
const TOP_HALF_W = 100;
const BOT_HALF_W = 100;
const CHAMBER_H = 106;
const GRAIN_SPAWN_X = CX;
const GRAIN_SPAWN_Y = NECK_TOP_Y + 2;
const GRAVITY = 380;
const SPAWN_INTERVAL_MS = 90;

interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  shade: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
}

interface Sparkle {
  x: number;
  y: number;
  age: number;
  life: number;
}

interface AnimState {
  grains: Grain[];
  ripples: Ripple[];
  sparkles: Sparkle[];
  lastSpawn: number;
  lastSparkle: number;
  lastFrame: number;
}

interface PropsSnapshot {
  elapsedSeconds: number;
  estimatedSeconds: number;
  paused: boolean;
  sandPack: SandPack;
}

export function Hourglass({ elapsedSeconds, estimatedSeconds, paused = false, sandPack = 'classic' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef<PropsSnapshot>({ elapsedSeconds, estimatedSeconds, paused, sandPack });
  const stateRef = useRef<AnimState>({
    grains: [],
    ripples: [],
    sparkles: [],
    lastSpawn: 0,
    lastSparkle: 0,
    lastFrame: 0,
  });
  const rafRef = useRef<number>(0);

  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    propsRef.current = { elapsedSeconds, estimatedSeconds, paused, sandPack };
  }, [elapsedSeconds, estimatedSeconds, paused, sandPack]);

  // Sound-reactive tremor.
  useEffect(() => {
    let timeoutId: number | undefined;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ name: string }>;
      if (!ce.detail || ce.detail.name === 'click') return;
      setIsShaking(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsShaking(false), 260);
    };
    window.addEventListener('focusand:sound', handler);
    return () => {
      window.removeEventListener('focusand:sound', handler);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    stateRef.current.lastFrame = performance.now();

    const loop = (time: number) => {
      const state = stateRef.current;
      const dt = Math.min(50, time - state.lastFrame) / 1000;
      state.lastFrame = time;

      const { elapsedSeconds, estimatedSeconds, paused, sandPack } = propsRef.current;
      const safeEst = Math.max(1, estimatedSeconds);
      const rawProgress = elapsedSeconds / safeEst;
      const progress = Math.min(1, rawProgress);
      const overrun = rawProgress > 1;
      const remainingRatio = 1 - progress;

      const tone: Tone = overrun ? 'red' : remainingRatio <= 0.25 ? 'orange' : 'amber';
      const palette = SAND_PACKS[sandPack][tone];

      ctx.clearRect(0, 0, W, H);

      drawTopFill(ctx, progress, palette);
      drawPile(ctx, progress, palette);

      if (!paused && progress > 0 && progress < 1) {
        spawnGrains(state, time);
      }
      updateGrains(state, dt, progress);
      drawGrains(ctx, state.grains, palette);

      updateRipples(state, dt);
      drawRipples(ctx, state.ripples, palette);

      if (!paused && progress > 0 && progress < 1) {
        spawnSparkles(state, time, progress);
      }
      updateSparkles(state, dt);
      drawSparkles(ctx, state.sparkles);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const safeEstimated = Math.max(1, estimatedSeconds);
  const rawProgress = elapsedSeconds / safeEstimated;
  const overrun = rawProgress > 1;
  const remainingRatio = 1 - Math.min(1, rawProgress);
  const tone: Tone = overrun ? 'red' : remainingRatio <= 0.25 ? 'orange' : 'amber';
  const remainingDisplay = overrun ? -(elapsedSeconds - safeEstimated) : safeEstimated - elapsedSeconds;
  const percent = Math.round(rawProgress * 100);

  return (
    <div className={`hourglass tone-${tone} ${paused ? 'is-paused' : ''} ${overrun ? 'is-overrun' : ''}`}>
      <div className="hourglass__stage">
        <div className={`hourglass__tilt ${isShaking ? 'is-shaking' : ''}`}>
          <svg
            className="hourglass__frame"
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            aria-hidden
          >
            <defs>
              <linearGradient id="hg-glass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.10)" />
                <stop offset="100%" stopColor="rgba(139, 92, 246, 0.04)" />
              </linearGradient>
              <linearGradient id="hg-frame" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b6f47" />
                <stop offset="50%" stopColor="#a07b52" />
                <stop offset="100%" stopColor="#6b5236" />
              </linearGradient>
              <linearGradient id="hg-frame-shine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="40%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            <rect x={5} y={0} width={W - 10} height={22} rx={5} fill="url(#hg-frame)" />
            <rect x={5} y={0} width={W - 10} height={22} rx={5} fill="url(#hg-frame-shine)" />

            <polygon
              points={`${CX - TOP_HALF_W},${TOP_Y} ${CX + TOP_HALF_W},${TOP_Y} ${CX + 3},${TOP_BOT_Y} ${CX - 3},${TOP_BOT_Y}`}
              fill="url(#hg-glass)"
              stroke="rgba(99, 102, 241, 0.32)"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />

            <polygon
              points={`${CX - TOP_HALF_W + 8},${TOP_Y + 3} ${CX - TOP_HALF_W + 24},${TOP_Y + 3} ${CX - 2},${TOP_BOT_Y - 4} ${CX - 8},${TOP_BOT_Y - 4}`}
              fill="rgba(255,255,255,0.18)"
            />

            <rect
              x={CX - 7}
              y={NECK_TOP_Y}
              width={14}
              height={NECK_BOT_Y - NECK_TOP_Y}
              fill="url(#hg-glass)"
              stroke="rgba(99, 102, 241, 0.32)"
              strokeWidth={1.4}
            />

            <polygon
              points={`${CX - 3},${BOT_TOP_Y} ${CX + 3},${BOT_TOP_Y} ${CX + BOT_HALF_W},${BOT_BOT_Y} ${CX - BOT_HALF_W},${BOT_BOT_Y}`}
              fill="url(#hg-glass)"
              stroke="rgba(99, 102, 241, 0.32)"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />

            <polygon
              points={`${CX - 3},${BOT_TOP_Y + 4} ${CX + 3},${BOT_TOP_Y + 4} ${CX - BOT_HALF_W + 24},${BOT_BOT_Y - 3} ${CX - BOT_HALF_W + 8},${BOT_BOT_Y - 3}`}
              fill="rgba(255,255,255,0.16)"
            />

            <rect x={5} y={258} width={W - 10} height={22} rx={5} fill="url(#hg-frame)" />
            <rect x={5} y={272} width={W - 10} height={6} fill="rgba(0,0,0,0.22)" />
          </svg>

          <canvas ref={canvasRef} className="hourglass__canvas" />
        </div>
      </div>

      <div className="hourglass__readout">
        <div className="hourglass__time">{formatDuration(remainingDisplay)}</div>
        <div className="hourglass__label">
          {paused ? 'En pause' : overrun ? 'Temps dépassé' : `${percent}%`}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Sand packs — palettes per state per pack
// =====================================================================

type Tone = 'amber' | 'orange' | 'red';

interface Palette {
  top: string;
  bottom: string;
  grain: string;
  spark: string;
}

export const SAND_PACKS: Record<SandPack, Record<Tone, Palette>> = {
  classic: {
    amber:  { top: '#fbbf24', bottom: '#d97706', grain: '#f59e0b', spark: 'rgba(254, 240, 138, 0.9)' },
    orange: { top: '#fb923c', bottom: '#ea580c', grain: '#f97316', spark: 'rgba(255, 215, 170, 0.9)' },
    red:    { top: '#f87171', bottom: '#dc2626', grain: '#ef4444', spark: 'rgba(254, 202, 202, 0.9)' },
  },
  lava: {
    amber:  { top: '#fb923c', bottom: '#7c2d12', grain: '#ea580c', spark: 'rgba(254, 215, 170, 0.95)' },
    orange: { top: '#ef4444', bottom: '#7f1d1d', grain: '#dc2626', spark: 'rgba(254, 202, 202, 0.95)' },
    red:    { top: '#dc2626', bottom: '#450a0a', grain: '#991b1b', spark: 'rgba(254, 220, 180, 0.95)' },
  },
  glacier: {
    amber:  { top: '#7dd3fc', bottom: '#0369a1', grain: '#38bdf8', spark: 'rgba(220, 240, 255, 0.95)' },
    orange: { top: '#5eead4', bottom: '#0e7490', grain: '#22d3ee', spark: 'rgba(220, 255, 250, 0.9)' },
    red:    { top: '#a78bfa', bottom: '#4c1d95', grain: '#8b5cf6', spark: 'rgba(240, 230, 255, 0.9)' },
  },
  emerald: {
    amber:  { top: '#86efac', bottom: '#15803d', grain: '#4ade80', spark: 'rgba(220, 255, 220, 0.9)' },
    orange: { top: '#a3e635', bottom: '#4d7c0f', grain: '#84cc16', spark: 'rgba(245, 255, 220, 0.9)' },
    red:    { top: '#fbbf24', bottom: '#92400e', grain: '#f59e0b', spark: 'rgba(254, 240, 138, 0.9)' },
  },
  gold: {
    amber:  { top: '#fde047', bottom: '#a16207', grain: '#facc15', spark: 'rgba(255, 250, 200, 0.95)' },
    orange: { top: '#fb923c', bottom: '#9a3412', grain: '#f97316', spark: 'rgba(255, 220, 170, 0.9)' },
    red:    { top: '#dc2626', bottom: '#7f1d1d', grain: '#ef4444', spark: 'rgba(254, 202, 202, 0.9)' },
  },
};

export const SAND_PACK_LABELS: Record<SandPack, { label: string; sample: string }> = {
  classic: { label: 'Classique', sample: '#f59e0b' },
  lava:    { label: 'Lave',      sample: '#dc2626' },
  glacier: { label: 'Glacier',   sample: '#38bdf8' },
  emerald: { label: 'Émeraude',  sample: '#4ade80' },
  gold:    { label: 'Or',        sample: '#facc15' },
};

// =====================================================================
// Canvas drawing helpers
// =====================================================================

function drawTopFill(ctx: CanvasRenderingContext2D, progress: number, palette: Palette): void {
  const yLevel = TOP_Y + CHAMBER_H * (1 - progress);
  if (yLevel >= TOP_BOT_Y - 0.5) return;

  const widthAtLevel = (TOP_HALF_W * 2) * ((TOP_BOT_Y - yLevel) / CHAMBER_H);
  const halfW = widthAtLevel / 2;

  const gradient = ctx.createLinearGradient(0, TOP_Y, 0, TOP_BOT_Y);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(1, palette.bottom);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(CX - TOP_HALF_W, TOP_Y);
  ctx.lineTo(CX + TOP_HALF_W, TOP_Y);
  ctx.lineTo(CX + halfW, yLevel + 1.5);
  ctx.quadraticCurveTo(CX, yLevel - 1, CX - halfW, yLevel + 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX - halfW + 1, yLevel + 1);
  ctx.quadraticCurveTo(CX, yLevel - 0.5, CX + halfW - 1, yLevel + 1);
  ctx.stroke();
}

function drawPile(ctx: CanvasRenderingContext2D, progress: number, palette: Palette): void {
  if (progress <= 0) return;

  const yTop = BOT_BOT_Y - CHAMBER_H * progress;
  const widthAtTop = (BOT_HALF_W * 2) * progress;
  const halfW = widthAtTop / 2;

  const gradient = ctx.createLinearGradient(0, yTop, 0, BOT_BOT_Y);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(1, palette.bottom);
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(CX - BOT_HALF_W, BOT_BOT_Y);
  ctx.lineTo(CX + BOT_HALF_W, BOT_BOT_Y);
  ctx.lineTo(CX + halfW, yTop + 2);
  const bumpHeight = Math.min(6, halfW * 0.18);
  ctx.bezierCurveTo(
    CX + halfW * 0.5, yTop - bumpHeight,
    CX - halfW * 0.5, yTop - bumpHeight,
    CX - halfW, yTop + 2,
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX - halfW + 2, yTop + 2);
  ctx.bezierCurveTo(
    CX - halfW * 0.5, yTop - bumpHeight + 1,
    CX + halfW * 0.5, yTop - bumpHeight + 1,
    CX + halfW - 2, yTop + 2,
  );
  ctx.stroke();
}

function spawnGrains(state: AnimState, time: number): void {
  if (time - state.lastSpawn < SPAWN_INTERVAL_MS) return;
  state.lastSpawn = time;
  state.grains.push({
    x: GRAIN_SPAWN_X + (Math.random() - 0.5) * 4,
    y: GRAIN_SPAWN_Y,
    vx: (Math.random() - 0.5) * 8,
    vy: 30 + Math.random() * 30,
    r: 1.2 + Math.random() * 0.9,
    shade: Math.random(),
  });
}

function updateGrains(state: AnimState, dt: number, progress: number): void {
  const yTop = BOT_BOT_Y - CHAMBER_H * progress;
  const halfW = (BOT_HALF_W * 2) * progress / 2;
  const bumpHeight = Math.min(6, halfW * 0.18);

  const remaining: Grain[] = [];
  for (const g of state.grains) {
    g.vy += GRAVITY * dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;

    const distFromCenter = Math.abs(g.x - CX) / Math.max(1, halfW);
    const surfaceY = halfW > 1
      ? yTop + 2 - bumpHeight * (1 - Math.min(1, distFromCenter)) * (1 - Math.min(1, distFromCenter))
      : yTop + 2;

    if (g.y >= surfaceY) {
      state.ripples.push({
        x: g.x,
        y: surfaceY,
        age: 0,
        life: 320 + Math.random() * 120,
      });
      continue;
    }
    if (g.y > BOT_BOT_Y) continue;

    if (g.y < NECK_BOT_Y) {
      if (g.x < CX - 5) { g.x = CX - 5; g.vx = Math.abs(g.vx) * 0.4; }
      if (g.x > CX + 5) { g.x = CX + 5; g.vx = -Math.abs(g.vx) * 0.4; }
    }

    remaining.push(g);
  }
  state.grains = remaining;
}

function drawGrains(ctx: CanvasRenderingContext2D, grains: readonly Grain[], palette: Palette): void {
  ctx.fillStyle = palette.grain;
  ctx.shadowColor = palette.grain;
  ctx.shadowBlur = 4;
  for (const g of grains) {
    ctx.globalAlpha = 0.85 + g.shade * 0.15;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function updateRipples(state: AnimState, dt: number): void {
  const dtMs = dt * 1000;
  state.ripples = state.ripples.filter((r) => {
    r.age += dtMs;
    return r.age < r.life;
  });
}

function drawRipples(ctx: CanvasRenderingContext2D, ripples: readonly Ripple[], palette: Palette): void {
  ctx.strokeStyle = palette.spark;
  for (const r of ripples) {
    const t = r.age / r.life;
    const radius = 1 + t * 5;
    ctx.globalAlpha = (1 - t) * 0.55;
    ctx.lineWidth = 1 - t * 0.7;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI, true);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function spawnSparkles(state: AnimState, time: number, progress: number): void {
  const remaining = 1 - progress;
  if (remaining < 0.05) return;
  if (time - state.lastSparkle < 350 + (1 - remaining) * 1200) return;
  state.lastSparkle = time;

  const yLevel = TOP_Y + CHAMBER_H * (1 - progress);
  const y = TOP_Y + 6 + Math.random() * Math.max(2, yLevel - TOP_Y - 10);
  const halfWAtY = TOP_HALF_W * ((TOP_BOT_Y - y) / CHAMBER_H);
  const x = CX + (Math.random() - 0.5) * (halfWAtY * 1.6);

  state.sparkles.push({ x, y, age: 0, life: 700 + Math.random() * 600 });
}

function updateSparkles(state: AnimState, dt: number): void {
  const dtMs = dt * 1000;
  state.sparkles = state.sparkles.filter((s) => {
    s.age += dtMs;
    return s.age < s.life;
  });
}

function drawSparkles(ctx: CanvasRenderingContext2D, sparkles: readonly Sparkle[]): void {
  for (const s of sparkles) {
    const t = s.age / s.life;
    const alpha = Math.sin(t * Math.PI) * 0.85;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.9 + Math.sin(t * Math.PI) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
