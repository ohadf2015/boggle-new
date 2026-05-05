import type { BlastTileType } from './types';
import type { TilePhase } from './BlastTile';
import { CLEARING_COLORS, CLEARING_ANIMS } from './blastTileVisuals';

export const TILE_TEXT_SHADOW_STYLE = { textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 2px 3px rgba(0,0,0,0.2)' } as const;
export const TILE_TEXT_SHADOW_LIGHT_STYLE = { textShadow: '0 1px 2px rgba(0,0,0,0.4)' } as const;

export const MULTIPLIER_BADGES: Partial<Record<BlastTileType, string>> = {
  gold: '×3',
  diamond: '×5',
};

export const PORTAL_PAIR_COLORS = ['#FF6B9D', '#00E5FF', '#FFD700', '#B388FF', '#69F0AE'];

export const MULTI_HIT_MAX: Partial<Record<BlastTileType, number>> = {
  ice: 2,
  prism: 2,
  gem: 3,
  frozen: 2,
};

export const RARE_LETTERS = new Set(['Q', 'Z', 'X', 'J']);

export const ANIMATED_PHASES = new Set<TilePhase>(['anticipation', 'clearing', 'falling', 'appearing', 'landing']);

export function getCrackClass(type: BlastTileType, hitsRemaining?: number): string {
  const maxHits = MULTI_HIT_MAX[type];
  if (!maxHits || hitsRemaining == null || hitsRemaining >= maxHits) return '';
  if (hitsRemaining <= 1 && maxHits >= 3) return 'blast-tile-critical';
  if (hitsRemaining < maxHits) return 'blast-tile-cracked';
  return '';
}

export function getSpecialEffectClasses(type: BlastTileType, phase: TilePhase, hitsRemaining?: number): string {
  const classes: string[] = [];

  if (type === 'gem') {
    if (hitsRemaining != null && hitsRemaining > 0) classes.push(`blast-tile-gem-glow-${hitsRemaining}`);
    if (phase === 'clearing') classes.push('blast-tile-gem-golden-flash');
  } else if (type === 'frozen') {
    if (hitsRemaining != null && hitsRemaining < (MULTI_HIT_MAX.frozen ?? 2)) classes.push('blast-tile-frozen-cracked');
    if (phase === 'clearing') classes.push('blast-tile-frozen-emerge');
  } else if (type === 'ice') {
    classes.push('blast-tile-ice-shimmer');
  }

  return classes.join(' ');
}

export function getPhaseStyles(
  phase: TilePhase,
  type: BlastTileType,
  fallOffset?: number,
  clearRotate?: number,
  spawnOffset?: number,
): React.CSSProperties {
  const clearing = CLEARING_COLORS[type];
  switch (phase) {
    case 'anticipation':
      return { filter: 'brightness(1.4)', transform: 'scale(1.1)', transition: 'all 120ms ease-out' };
    case 'clearing': {
      const clearingAnim = CLEARING_ANIMS[type];
      const isLightning = type === 'lightning';
      return {
        transform: clearingAnim?.transform ?? `scale(1.3) rotate(${clearRotate ?? 0}deg)`,
        opacity: 0,
        filter: clearingAnim?.filter,
        transition: clearingAnim?.transition ?? 'all 180ms ease-in',
        ...(clearing && { background: clearing.background, border: clearing.border }),
        ...(isLightning && {
          background: 'white',
          boxShadow: '0 0 24px 8px rgba(0,255,255,0.7), 0 0 48px 16px rgba(255,255,255,0.4)',
          animation: 'blastLightningFlash 160ms ease-in forwards',
        }),
      };
    }
    case 'falling': {
      const dist = fallOffset ?? 0;
      const fallDuration = Math.max(250, 180 + dist * 0.8);
      return {
        animation: `blastTileFall ${fallDuration}ms cubic-bezier(0.4, 0, 0.6, 1) forwards`,
        '--fall-from': `-${dist}px`,
      } as React.CSSProperties;
    }
    case 'appearing':
      return {
        '--spawn-from': `${-(spawnOffset ?? 60)}px`,
        opacity: 0,
        animation: 'blastTileAppear 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      } as React.CSSProperties;
    case 'landing':
      return {
        transform: 'scaleY(1.08) scaleX(0.94)',
        transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    default:
      return {};
  }
}

export function getSelectionScale(selectionIndex?: number, selectionTotal?: number): number {
  if (selectionIndex == null || !selectionTotal || selectionTotal <= 1) return 1.05;
  const t = selectionIndex / (selectionTotal - 1);
  return Math.round((1.05 + t * 0.07) * 1000) / 1000;
}

export function getPhaseClasses(phase: TilePhase, isSelected: boolean): string {
  if (phase === 'selected' || (phase === 'idle' && isSelected)) {
    return `ring-3 ring-neo-lime ring-offset-2 ring-offset-neo-navy shadow-hard-lime blast-tile-select-pop`;
  }
  return '';
}

export function getColorTagGlow(colorTag?: 'pink' | 'cyan' | 'lime'): string {
  if (!colorTag) return '';
  const colorMap: Record<string, string> = {
    pink: 'ring-2 ring-neo-pink animate-pulse',
    cyan: 'ring-2 ring-neo-cyan animate-pulse',
    lime: 'ring-2 ring-neo-lime animate-pulse',
  };
  return colorMap[colorTag] || '';
}

export function getSelectionStyles(isSelected: boolean, selectionIndex?: number, selectionTotal?: number): React.CSSProperties {
  if (!isSelected) return {};
  const scale = getSelectionScale(selectionIndex, selectionTotal);
  return { transform: `scale(${scale})` };
}
