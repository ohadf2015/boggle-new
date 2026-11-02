import type { CSSProperties } from 'react';
import type { BlastGemKind } from '@/shared/types/blast';

const INK = '#0b1530';

/** Flat face, darker lip and bright facet tint per gem. Rarer gems are hotter. */
export const GEM_PALETTE: Record<BlastGemKind, { face: string; lip: string; light: string; dark: string; glow: string }> = {
  emerald: { face: '#3DDC84', lip: '#14833F', light: '#B8FFD4', dark: '#0E6B34', glow: 'rgba(61,220,132,0.55)' },
  sapphire: { face: '#4D8DFF', lip: '#1E4DB7', light: '#BCD6FF', dark: '#173A8C', glow: 'rgba(77,141,255,0.55)' },
  amethyst: { face: '#B26BFF', lip: '#6A2DB8', light: '#E3C8FF', dark: '#4C1E8A', glow: 'rgba(178,107,255,0.6)' },
  ruby: { face: '#FF2E93', lip: '#A8125E', light: '#FFC2E0', dark: '#7A0A44', glow: 'rgba(255,46,147,0.65)' },
};

/** 1 (common find) to 4 (jackpot): drives glow strength and the tile's idle shimmer. */
export const GEM_RARITY: Record<BlastGemKind, 1 | 2 | 3 | 4> = { emerald: 1, sapphire: 2, amethyst: 3, ruby: 4 };

export function gemTileStyle(gem: BlastGemKind): CSSProperties {
  const p = GEM_PALETTE[gem];
  return {
    background: p.face,
    border: `2px solid ${INK}`,
    boxShadow: `0 3px 0 0 ${INK}, inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -5px 0 ${p.lip}${GEM_RARITY[gem] >= 3 ? `, 0 0 14px ${p.glow}` : ''}`,
  };
}
