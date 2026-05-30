import { storageService } from './storage.service';
import { isQuietHour } from '@/models/settings';

/**
 * Sound effects synthesized on the fly with Web Audio API — no binary
 * assets, no network. Designed to be soft, motivating, and never harsh.
 *
 * Note: AudioContext lives only in the popup; service-worker triggered
 * events (timer end while popup closed) rely on chrome.notifications
 * which carry their own system sound.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('AudioContext not supported');
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

interface NoteOpts {
  freq: number;
  /** Seconds from now to start. */
  at?: number;
  /** Seconds — attack + decay envelope length. */
  duration?: number;
  /** Peak gain (0..1). */
  gain?: number;
  /** 'sine' is mellow; 'triangle' a bit richer. */
  type?: OscillatorType;
}

function playNote(audioCtx: AudioContext, master: GainNode, opts: NoteOpts): void {
  const { freq, at = 0, duration = 0.6, gain = 0.4, type = 'sine' } = opts;
  const start = audioCtx.currentTime + at;
  const end = start + duration;

  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(env).connect(master);
  osc.start(start);
  osc.stop(end + 0.05);
}

async function withMaster(
  name: string,
  callback: (audioCtx: AudioContext, master: GainNode) => void,
): Promise<void> {
  const settings = await storageService.getSettings();
  if (!settings.soundEnabled) return;
  if (isQuietHour(new Date(), settings)) return;

  try {
    const audioCtx = getCtx();
    const master = audioCtx.createGain();
    master.gain.value = settings.soundVolume;
    master.connect(audioCtx.destination);
    callback(audioCtx, master);
    // Notify the UI so visuals (e.g. hourglass tremor) can react.
    window.dispatchEvent(new CustomEvent('focusand:sound', { detail: { name } }));
  } catch {
    // Audio failed — silently ignore.
  }
}

export const soundService = {
  /** Two-note ascending bell — task start. */
  start(): Promise<void> {
    return withMaster('start', (c, m) => {
      playNote(c, m, { freq: 659.25, at: 0, duration: 0.5, gain: 0.35 }); // E5
      playNote(c, m, { freq: 880.0, at: 0.12, duration: 0.7, gain: 0.32 }); // A5
    });
  },

  /** Soft single bell — 10 min remaining. */
  tenMinutesLeft(): Promise<void> {
    return withMaster('tenMinutesLeft', (c, m) => {
      playNote(c, m, { freq: 587.33, at: 0, duration: 1.2, gain: 0.3, type: 'sine' }); // D5
      playNote(c, m, { freq: 1174.66, at: 0, duration: 0.8, gain: 0.08, type: 'sine' }); // harmonic
    });
  },

  /** Warm 3-note major chord — kept as a softer alternative. */
  completeOnTime(): Promise<void> {
    return withMaster('completeOnTime', (c, m) => {
      playNote(c, m, { freq: 523.25, at: 0, duration: 0.55 });      // C5
      playNote(c, m, { freq: 659.25, at: 0.10, duration: 0.55 });   // E5
      playNote(c, m, { freq: 783.99, at: 0.20, duration: 0.9 });    // G5
    });
  },

  /**
   * "Cha-CHING!" — Amazon Seller / cash register style reward sound.
   * Two bell strikes (low → high) with a metallic attack click.
   * Plays on every successful task completion.
   */
  cashRegister(): Promise<void> {
    return withMaster('cashRegister', (c, m) => {
      const now = c.currentTime;

      // Metallic attack click — short high-passed noise burst (~25ms).
      const noiseLen = Math.floor(c.sampleRate * 0.025);
      const noiseBuf = c.createBuffer(1, noiseLen, c.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
      }
      const noise = c.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3500;
      const noiseGain = c.createGain();
      noiseGain.gain.value = 0.45;
      noise.connect(hp).connect(noiseGain).connect(m);
      noise.start(now);

      // === "Cha" strike (t=0) — lower, fuller bell ===
      // Triangle gives a slightly metallic edge that sine alone lacks.
      playNote(c, m, { freq: 1046.50, at: 0,    duration: 0.85, gain: 0.30, type: 'triangle' }); // C6
      playNote(c, m, { freq: 1567.98, at: 0,    duration: 0.65, gain: 0.20, type: 'sine' });     // G6
      playNote(c, m, { freq: 2093.00, at: 0,    duration: 0.55, gain: 0.16, type: 'sine' });     // C7
      playNote(c, m, { freq: 3135.96, at: 0,    duration: 0.35, gain: 0.10, type: 'sine' });     // G7

      // === "CHING!" strike (t=180ms) — higher, brighter, longer tail ===
      playNote(c, m, { freq: 1318.51, at: 0.18, duration: 1.10, gain: 0.32, type: 'triangle' }); // E6
      playNote(c, m, { freq: 1975.53, at: 0.18, duration: 0.85, gain: 0.22, type: 'sine' });     // B6
      playNote(c, m, { freq: 2637.02, at: 0.18, duration: 0.65, gain: 0.16, type: 'sine' });     // E7
      playNote(c, m, { freq: 3951.07, at: 0.18, duration: 0.45, gain: 0.10, type: 'sine' });     // B7
      playNote(c, m, { freq: 5274.04, at: 0.18, duration: 0.30, gain: 0.06, type: 'sine' });     // E8 shimmer
    });
  },

  /** Gentle low tone — late or abandoned. */
  overrun(): Promise<void> {
    return withMaster('overrun', (c, m) => {
      playNote(c, m, { freq: 220, at: 0, duration: 0.4, gain: 0.25, type: 'triangle' });   // A3
      playNote(c, m, { freq: 174.61, at: 0.18, duration: 0.6, gain: 0.22, type: 'triangle' }); // F3
    });
  },

  /** Quick click — pause/resume confirm. */
  click(): Promise<void> {
    return withMaster('click', (c, m) => {
      playNote(c, m, { freq: 880, at: 0, duration: 0.06, gain: 0.15 });
    });
  },
};
