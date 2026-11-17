import type { CSSProperties } from 'react';

/*
 * The "candy key" face the Blast board uses for its letter tiles: a flat brand
 * hue, an ink border, a hard ink drop, a top highlight and a deeper lip. No
 * blur, so it stays inside the neo-brutalist look while reading as a chunky,
 * pressable thing instead of a flat box.
 */
const INK = '#0b1530';

export type CandyHue = 'cream' | 'gold' | 'lime' | 'pink' | 'cyan';

const FACES: Record<CandyHue, { face: string; lip: string }> = {
  cream: { face: '#FFFEF0', lip: 'rgba(11,21,48,0.16)' },
  gold: { face: '#FFD32A', lip: '#C98A00' },
  lime: { face: '#BFFF00', lip: '#6E9A00' },
  pink: { face: '#FF5FA8', lip: '#B0125E' },
  cyan: { face: '#5EE6D0', lip: '#1C9C8A' },
};

export function candyKey(hue: CandyHue, drop = 3): CSSProperties {
  const { face, lip } = FACES[hue];
  return {
    background: face,
    border: `2px solid ${INK}`,
    boxShadow: `0 ${drop}px 0 0 ${INK}, inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -4px 0 ${lip}`,
  };
}
