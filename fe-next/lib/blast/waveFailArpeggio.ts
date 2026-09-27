/**
 * waveFailArpeggio — descending 3-note empathy cue when a Blast wave fails.
 *
 * G4 → E4 → C3, sine wave, 150ms per note, -9dB. Plays through the standard
 * Web Audio API so it respects the OS volume + iOS silent switch (no Howler
 * preload required for a one-shot 450ms cue).
 *
 * Failure-mode safe: silently no-ops if AudioContext is missing (SSR, locked
 * audio context on first interaction, etc.). Decorative — never blocks gameplay.
 */

/** G4, E4, C3 — descending major-third + octave-down for "soft landing" feel. */
export const WAVE_FAIL_NOTES_HZ: readonly [number, number, number] = [392, 330, 131];

export const WAVE_FAIL_NOTE_DURATION_MS = 150;

/** Peak gain (volume) per note. -9dB ≈ 0.35 amplitude. */
const NOTE_PEAK_GAIN = 0.35;

/** Decay tail prevents the click that would happen on instant stop. */
const NOTE_DECAY_TAIL_S = 0.04;

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof globalThis === 'undefined') return null;
  const w = globalThis as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function playWaveFailArpeggio(): void {
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    const noteDurationS = WAVE_FAIL_NOTE_DURATION_MS / 1000;

    WAVE_FAIL_NOTES_HZ.forEach((freq, i) => {
      const startAt = ctx.currentTime + i * noteDurationS;
      const stopAt = startAt + noteDurationS + NOTE_DECAY_TAIL_S;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);

      const gain = ctx.createGain();
      // Quick fade-in to avoid click, then exponential decay for smooth release.
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(NOTE_PEAK_GAIN, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(stopAt);
    });
  } catch {
    /* decorative cue — never break gameplay on audio failure */
  }
}
