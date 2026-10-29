/**
 * Intensity curves for the Blast FX layer. Pure so the "a 3-letter word is a
 * tap, a 7-letter word is an event" contract is unit-tested, not eyeballed.
 */

export type ShakeLevel = 'none' | 'light' | 'medium' | 'heavy';

export interface WordFxIntensity {
  /** 0..1 overall weight of the word. */
  power: number;
  /** Multiplier on burst particle counts. */
  particleScale: number;
  shake: ShakeLevel;
  /** Playback-rate multiplier for layered sfx. */
  pitch: number;
  /** 7+ letters: banner flourish behind the praise stamp. */
  bigWord: boolean;
}

export const BIG_WORD_LETTERS = 7;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function wordFxIntensity(letters: number, score = 0): WordFxIntensity {
  const n = Number.isFinite(letters) ? letters : 0;
  const lenP = clamp01((n - 3) / 5);
  const scoreP = clamp01((Number.isFinite(score) ? score : 0) / 50);
  const power = n < 3 ? 0 : clamp01(0.75 * lenP + 0.25 * scoreP);
  const shake: ShakeLevel = power < 0.15 ? 'none' : power < 0.45 ? 'light' : power < 0.75 ? 'medium' : 'heavy';
  return {
    power,
    particleScale: 0.6 + 1.4 * power,
    shake,
    pitch: n < 3 ? 1 : Math.min(1.4, 1 + 0.06 * (n - 3)),
    bigWord: n >= BIG_WORD_LETTERS,
  };
}

/** Neo lime → cyan → pink → purple; mirrors the --neo-* tokens (Pixi needs numbers). */
export const CHAIN_EDGE_COLORS = [0xbfff00, 0x00ffff, 0xff1493, 0xc084fc] as const;

// A minor pentatonic from A4: every step is consonant with the last.
const PENTATONIC = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

export interface ChainFxStep {
  freq: number;
  rings: number;
  edgeColor: number;
}

export function chainFxStep(level: number): ChainFxStep {
  const l = Math.max(0, Math.floor(Number.isFinite(level) ? level : 0));
  return {
    freq: PENTATONIC[Math.min(l, PENTATONIC.length - 1)],
    rings: Math.min(l, 4),
    edgeColor: CHAIN_EDGE_COLORS[Math.min(Math.max(l - 1, 0), CHAIN_EDGE_COLORS.length - 1)],
  };
}

// Major-pentatonic climb from A5: coins in a stack ring like a rising arcade payout.
const COIN_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export function coinChimeFreq(stackIndex: number): number {
  const i = Math.min(Math.max(0, Math.floor(stackIndex)), COIN_STEPS.length - 1);
  return 880 * 2 ** (COIN_STEPS[i] / 12);
}
