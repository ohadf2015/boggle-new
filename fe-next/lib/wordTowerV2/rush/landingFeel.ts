import type { BlockTrait } from './types';

export const HITSTOP_MS = 70;
const COMBO_TIERS = 8;

export function traitTint(trait: BlockTrait | undefined): [number, number] | 'gold' | null {
  switch (trait) {
    case 'gold':
      return 'gold';
    case 'feather':
      return [0xf2f7ff, 0xa9b8d6];
    case 'anvil':
      return [0x4a4f66, 0x22263a];
    case 'magnet':
      return [0x37e0ff, 0x117f99];
    case 'lucky':
      return [0xff4d9d, 0xa8235f];
    default:
      return null;
  }
}

export interface LandingFeel {
  hitstopMs: number;
  squash: number;
  shake: number;
  punchPx: number;
}

/** Perfect-landing juice by combo; shake stays under the collapse kick (16) so a streak never reads as a crash. */
export function perfectLandingFeel(combo: number, reducedMotion: boolean): LandingFeel {
  if (reducedMotion) return { hitstopMs: 0, squash: 0, shake: 0, punchPx: 0 };
  const step = Math.min(Math.max(combo, 1), COMBO_TIERS) - 1;
  return {
    hitstopMs: HITSTOP_MS,
    squash: Math.min(1, 0.5 + step * 0.06),
    shake: 9 + step * 0.8,
    punchPx: 4 + step * 1.5,
  };
}
