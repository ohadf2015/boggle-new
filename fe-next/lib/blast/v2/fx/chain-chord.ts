import type { OvationTier } from '../engine';

export type Chord = {
  notes: number[]; // frequencies in Hz, played in sequence
  noteDurationMs: number;
};

// Pentatonic-major C-rooted intervals: C5 D5 E5 G5 A5 → satisfying, no dissonant clashes.
const PENTATONIC_C5 = [523.25, 587.33, 659.25, 783.99, 880.0];

export function chordForTier(tier: OvationTier): Chord {
  switch (tier) {
    case 'small':
      return { notes: [PENTATONIC_C5[2]!], noteDurationMs: 140 };
    case 'big':
      return { notes: [PENTATONIC_C5[0]!, PENTATONIC_C5[2]!, PENTATONIC_C5[3]!], noteDurationMs: 130 };
    case 'mega':
      return { notes: [...PENTATONIC_C5], noteDurationMs: 120 };
    case 'none':
    default:
      return { notes: [], noteDurationMs: 0 };
  }
}
