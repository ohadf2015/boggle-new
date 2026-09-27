const FREQS = [261.63, 329.63, 392.0]; // C-E-G major triad (Hz)

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor =
    (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Play a short 3-tone triad as feedback for a successful word-find.
 * Length boosts gain (longer word = louder triad). Octave offset shifts the
 * triad up/down for combo / opponent / steal variants.
 *
 * SSR-safe: no-ops if window or AudioContext is unavailable.
 * Idempotent re audio init: AudioContext is cached for the page lifetime.
 */
export function playWordFindChord(length: number, octaveOffset = 0): void {
  const audio = getCtx();
  if (!audio) return;

  const baseTime = audio.currentTime;
  const lengthBoost = Math.min(length / 8, 1);
  const gainPeak = 0.08 + lengthBoost * 0.06;

  FREQS.forEach((f, i) => {
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f * Math.pow(2, octaveOffset);
      osc.connect(gain).connect(audio.destination);
      const start = baseTime + i * 0.04;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.start(start);
      osc.stop(start + 0.13);
    } catch {
      // Audio path can fail mid-init (suspended ctx, autoplay restrictions);
      // never let it bubble — feedback is optional.
    }
  });
}
