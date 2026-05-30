import { useEffect, useRef } from 'react';
import type { Ambiance } from '@/models/ambiance';

interface Props {
  kind: Ambiance;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRotation: number;
  alpha: number;
  alphaPhase: number;
  color: string;
}

/**
 * Animated atmospheric overlay rendered behind the app content. Particles
 * vary by ambiance kind:
 *   sun    → twinkling sparkles + warm wash
 *   cloud  → drifting blurred shapes
 *   rain   → vertical falling streaks
 *   snow   → soft drifting flakes
 *   night  → twinkling stars
 *   forest → falling leaves with rotation
 */
export function AmbianceOverlay({ kind }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    if (kind === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    particlesRef.current = [];
    lastFrameRef.current = performance.now();
    lastSpawnRef.current = 0;

    // Pre-seed with some particles so the overlay isn't empty initially.
    for (let i = 0; i < initialCount(kind); i++) {
      particlesRef.current.push(spawnParticle(kind, canvas.clientWidth, canvas.clientHeight, true));
    }

    const loop = (time: number) => {
      const dt = Math.min(60, time - lastFrameRef.current) / 1000;
      lastFrameRef.current = time;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      // Spawn at the configured rate.
      const interval = spawnInterval(kind);
      if (time - lastSpawnRef.current > interval) {
        lastSpawnRef.current = time;
        particlesRef.current.push(spawnParticle(kind, w, h, false));
      }

      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;
        p.alphaPhase += dt;

        if (kind === 'night' || kind === 'sun') {
          // Twinkle effect.
          p.alpha = 0.4 + 0.5 * Math.abs(Math.sin(p.alphaPhase * 2));
        }

        if (p.y > h + 30 || p.x < -60 || p.x > w + 60) continue;

        draw(ctx, p, kind);
        alive.push(p);
      }
      particlesRef.current = alive;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    };
  }, [kind]);

  if (kind === 'none') return null;
  return <canvas ref={canvasRef} className={`ambiance-overlay ambiance-overlay--${kind}`} aria-hidden />;
}

// ----------------------------------------------------------------------
// Particle behavior per ambiance
// ----------------------------------------------------------------------

function initialCount(kind: Ambiance): number {
  switch (kind) {
    case 'rain':   return 18;
    case 'snow':   return 22;
    case 'cloud':  return 4;
    case 'sun':    return 6;
    case 'night':  return 28;
    case 'forest': return 8;
    default:       return 0;
  }
}

function spawnInterval(kind: Ambiance): number {
  switch (kind) {
    case 'rain':   return 70;
    case 'snow':   return 220;
    case 'cloud':  return 4500;
    case 'sun':    return 1400;
    case 'night':  return 1200;
    case 'forest': return 700;
    default:       return 9999;
  }
}

function spawnParticle(kind: Ambiance, w: number, h: number, seed: boolean): Particle {
  const yTop = seed ? Math.random() * h : -10;
  switch (kind) {
    case 'rain':
      return {
        x: Math.random() * w,
        y: yTop,
        vx: -30,
        vy: 480 + Math.random() * 220,
        size: 8 + Math.random() * 6,
        rotation: 0,
        vRotation: 0,
        alpha: 0.4 + Math.random() * 0.2,
        alphaPhase: 0,
        color: '#8aa9d6',
      };
    case 'snow':
      return {
        x: Math.random() * w,
        y: yTop,
        vx: (Math.random() - 0.5) * 30,
        vy: 35 + Math.random() * 45,
        size: 1.5 + Math.random() * 2.5,
        rotation: 0,
        vRotation: 0,
        alpha: 0.55 + Math.random() * 0.35,
        alphaPhase: 0,
        color: '#ffffff',
      };
    case 'cloud':
      return {
        x: seed ? Math.random() * w : -80,
        y: 10 + Math.random() * (h * 0.55),
        vx: 6 + Math.random() * 10,
        vy: 0,
        size: 50 + Math.random() * 60,
        rotation: 0,
        vRotation: 0,
        alpha: 0.18 + Math.random() * 0.12,
        alphaPhase: 0,
        color: '#cbd5e1',
      };
    case 'sun':
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.7,
        vx: 0,
        vy: 0,
        size: 1 + Math.random() * 1.8,
        rotation: 0,
        vRotation: 0,
        alpha: 0.7,
        alphaPhase: Math.random() * Math.PI * 2,
        color: '#fde68a',
      };
    case 'night':
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        vx: 0,
        vy: 0,
        size: 0.8 + Math.random() * 1.8,
        rotation: 0,
        vRotation: 0,
        alpha: 0.65,
        alphaPhase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.85 ? '#a78bfa' : '#f8fafc',
      };
    case 'forest':
      return {
        x: Math.random() * w,
        y: yTop,
        vx: (Math.random() - 0.5) * 50,
        vy: 45 + Math.random() * 30,
        size: 5 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 2,
        alpha: 0.55 + Math.random() * 0.3,
        alphaPhase: 0,
        color: pickLeafColor(),
      };
    default:
      return {
        x: 0, y: 0, vx: 0, vy: 0, size: 0,
        rotation: 0, vRotation: 0, alpha: 0, alphaPhase: 0, color: '#000',
      };
  }
}

function pickLeafColor(): string {
  const palette = ['#84cc16', '#f59e0b', '#ca8a04', '#7c2d12', '#16a34a'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function draw(ctx: CanvasRenderingContext2D, p: Particle, kind: Ambiance): void {
  ctx.save();
  ctx.globalAlpha = p.alpha;

  switch (kind) {
    case 'rain':
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + p.size);
      ctx.stroke();
      break;

    case 'snow':
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'cloud':
      ctx.fillStyle = p.color;
      ctx.filter = 'blur(8px)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
      break;

    case 'sun':
    case 'night':
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;

    case 'forest':
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stem
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(-p.size - 2, -1);
      ctx.stroke();
      break;
  }

  ctx.restore();
}
