import type { AmbientSound } from '@/models/ambiance';

/**
 * Loops a synthesized noise buffer for as long as a task is active.
 * Single instance per window context — calling play() with a new kind
 * cleanly swaps the source without clicks.
 *
 * All sounds are generated procedurally with Web Audio. No assets.
 */
class AmbientSoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private currentKind: AmbientSound = 'none';

  async play(kind: AmbientSound, volume: number): Promise<void> {
    if (kind === 'none') {
      this.stop();
      return;
    }

    // No-op when already playing the same kind — just update volume.
    if (kind === this.currentKind && this.master) {
      this.master.gain.setTargetAtTime(volume, this.ctx!.currentTime, 0.05);
      return;
    }

    this.stop();

    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      if (ctx.state === 'suspended') await ctx.resume();

      const buffer = createNoiseBuffer(ctx, kind);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const master = ctx.createGain();
      master.gain.value = 0;
      master.gain.setTargetAtTime(volume, ctx.currentTime, 0.15);
      master.connect(ctx.destination);

      // Optional shaping per kind.
      let lastNode: AudioNode = source;
      if (kind === 'rain') {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 250;
        source.connect(hp).connect(lp);
        lastNode = lp;
      } else if (kind === 'wind') {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;
        // Slow LFO on gain for breathing
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.18;
        lfoGain.gain.value = 0.3;
        lfo.connect(lfoGain);
        const windGain = ctx.createGain();
        windGain.gain.value = 0.7;
        lfoGain.connect(windGain.gain);
        source.connect(lp).connect(windGain);
        lfo.start();
        lastNode = windGain;
      }

      lastNode.connect(master);
      source.start();

      this.ctx = ctx;
      this.master = master;
      this.source = source;
      this.currentKind = kind;
    } catch {
      // Audio failure — stay silent.
    }
  }

  setVolume(volume: number): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  stop(): void {
    if (this.source) {
      try {
        // Fade out to avoid clicks.
        if (this.master && this.ctx) {
          this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
        }
        this.source.stop(this.ctx ? this.ctx.currentTime + 0.3 : undefined);
      } catch {
        // ignore
      }
    }
    const ctx = this.ctx;
    setTimeout(() => {
      ctx?.close().catch(() => {});
    }, 400);
    this.source = null;
    this.master = null;
    this.ctx = null;
    this.currentKind = 'none';
  }
}

// ----------------------------------------------------------------------
// Noise buffer generators
// ----------------------------------------------------------------------

const BUFFER_SECONDS = 6;

function createNoiseBuffer(ctx: AudioContext, kind: AmbientSound): AudioBuffer {
  switch (kind) {
    case 'white':
      return createWhiteBuffer(ctx);
    case 'pink':
      return createPinkBuffer(ctx);
    case 'brown':
      return createBrownBuffer(ctx);
    case 'rain':
      return createRainBuffer(ctx);
    case 'wind':
      return createPinkBuffer(ctx);
    default:
      return createWhiteBuffer(ctx);
  }
}

function createWhiteBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(2, ctx.sampleRate * BUFFER_SECONDS, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
  }
  return buf;
}

/** Voss-McCartney pink noise — soothing 1/f distribution. */
function createPinkBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(2, ctx.sampleRate * BUFFER_SECONDS, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buf;
}

/** Brown noise — deep rumble, 1/f² distribution. */
function createBrownBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(2, ctx.sampleRate * BUFFER_SECONDS, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      const next = (last + 0.02 * white) / 1.02;
      data[i] = next * 3.5;
      last = next;
    }
  }
  return buf;
}

/** Rain = pink noise + sparse droplet impulses. */
function createRainBuffer(ctx: AudioContext): AudioBuffer {
  const buf = createPinkBuffer(ctx);
  const sr = ctx.sampleRate;
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    // Add ~3 drops per second on average.
    const drops = BUFFER_SECONDS * 3;
    for (let d = 0; d < drops; d++) {
      const at = Math.floor(Math.random() * (data.length - sr * 0.02));
      const len = Math.floor(sr * 0.012);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        data[at + i] += (Math.random() * 2 - 1) * env * 0.6;
      }
    }
  }
  return buf;
}

export const ambientSoundService = new AmbientSoundPlayer();
