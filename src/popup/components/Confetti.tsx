import { useEffect, useRef } from 'react';

interface Props {
  /** When this number changes, a new burst is launched. */
  trigger: number;
  /** Optional master enable/disable. */
  enabled?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  size: number;
  color: string;
  alpha: number;
  shape: 'rect' | 'circle';
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#fbbf24'];
const GRAVITY = 0.18;
const FRICTION = 0.985;

function createParticles(width: number, height: number, count = 80): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) - Math.PI / 2; // upward bias
    const speed = 4 + Math.random() * 6;
    particles.push({
      x: width / 2,
      y: height * 0.35,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed - 2,
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.25,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  return particles;
}

export function Confetti({ trigger, enabled = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!enabled || trigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    particlesRef.current = createParticles(width, height);

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = Math.min(2, (time - lastTime) / 16.67); // normalized to 60fps
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.vy += GRAVITY * dt;
        p.vx *= FRICTION;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;
        p.alpha -= 0.006 * dt;

        if (p.alpha <= 0 || p.y > height + 20) continue;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        alive.push(p);
      }
      particlesRef.current = alive;

      if (alive.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, width, height);
    };
  }, [trigger, enabled]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />;
}
