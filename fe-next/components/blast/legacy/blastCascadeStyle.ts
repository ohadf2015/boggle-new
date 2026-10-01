import type { CSSProperties } from 'react';
import type { BlastTileType } from './types';
import type { TilePhase } from './BlastTile';
import { CLEARING_COLORS, CLEARING_ANIMS } from './blastTileVisuals';

const CHARGE_LIME = '#BFFF00';

const STAGGER_MS = 18;
const STAGGER_WRAP = 5;

export function getCascadeFallStyle(distPx: number, col: number): CSSProperties {
  const fallDuration = Math.max(250, 180 + distPx * 0.8);
  const colDelay = (col % STAGGER_WRAP) * STAGGER_MS;
  return {
    animation: `blastTileFall ${fallDuration}ms cubic-bezier(0.4, 0, 0.6, 1) ${colDelay}ms forwards`,
    ['--fall-from' as string]: `-${distPx}px`,
  } as CSSProperties;
}

export function getCascadeLandStyle(): CSSProperties {
  // Impact squash — short-and-wide (scaleY<1), uniform for all tile types.
  return {
    transform: 'scaleY(0.88) scaleX(1.1)',
    transition: 'transform 110ms cubic-bezier(0.34, 1.7, 0.5, 1)',
  };
}

export function getPhaseStyles(phase: TilePhase, type: BlastTileType, fallOffset?: number, clearRotate?: number, spawnOffset?: number, col?: number): CSSProperties {
  const clearing = CLEARING_COLORS[type];
  switch (phase) {
    case 'anticipation':
      if (type === 'standard') {
        return { background: CHARGE_LIME, transform: 'scale(1.12)', transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 60ms linear' };
      }
      return { filter: 'brightness(1.4)', transform: 'scale(1.1)', transition: 'all 120ms ease-out' };
    case 'clearing': {
      const clearingAnim = CLEARING_ANIMS[type];
      if (!clearingAnim && type !== 'lightning') {
        return {
          background: CHARGE_LIME,
          animation: 'blastTilePop 300ms cubic-bezier(0.3, 0, 0.7, 1) forwards',
          '--pop-rot': `${(clearRotate ?? 0) * 3}deg`,
        } as CSSProperties;
      }
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
      return getCascadeFallStyle(dist, col ?? 0);
    }
    case 'appearing':
      return {
        '--spawn-from': `${-(spawnOffset ?? 60)}px`,
        opacity: 0,
        animation: 'blastTileAppear 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      } as CSSProperties;
    case 'landing':
      // Impact squash — a landed tile compresses SHORT-and-wide (scaleY<1), not
      // taller. Same for every tile type (standard, ice, bomb…) so gravity reads
      // identically across the board. The overshoot ease springs it back to rest.
      return {
        transform: 'scaleY(0.88) scaleX(1.1)',
        transition: 'transform 110ms cubic-bezier(0.34, 1.7, 0.5, 1)',
      };
    default:
      return {};
  }
}

/**
 * Compute progressive selection scale: first tile 1.10x, last tile 1.22x.
 * Larger than the old 1.05–1.12 so the current word visibly "lifts" off the
 * board — selection should read at a glance, even on a busy TV/party screen.
 */
function getSelectionScale(selectionIndex?: number, selectionTotal?: number): number {
  if (selectionIndex == null || !selectionTotal || selectionTotal <= 1) return 1.1;
  const t = selectionIndex / (selectionTotal - 1);
  // Round to 3 decimals to avoid floating point noise
  return Math.round((1.1 + t * 0.12) * 1000) / 1000;
}

/**
 * Inline styles for selected tiles. The selection is an OVERLAY on top of the
 * tile's own face (so a selected bomb still looks like a bomb), amplified to
 * read by VALUE contrast:
 *  - real lift (translateY) + progressive scale → the active word rises,
 *  - a lime "active" ring wrapped in a thick navy ink ring → the navy gives the
 *    high value-contrast that makes selection unmistakable against BOTH the
 *    white standard face (where lime alone is too low-contrast) AND the bright
 *    special faces,
 *  - a hard (blur-free) drop shadow → neo-brutalist depth,
 *  - z-index lift so the scaled tile never hides behind a neighbour.
 */
export function getSelectionStyles(isSelected: boolean, selectionIndex?: number, selectionTotal?: number): CSSProperties {
  if (!isSelected) return {};
  const scale = getSelectionScale(selectionIndex, selectionTotal);
  return {
    transform: `translateY(-6px) scale(${scale})`,
    boxShadow:
      '0 0 0 3px #BFFF00, 0 0 0 6px #0b1530, 5px 6px 0 0 rgba(11,21,48,0.92), inset 0 2px 0 rgba(255,255,255,0.35)',
    // Brightness lift + a small lime energy glow — secondary juice, not the
    // primary signal (the hard rings above carry that).
    filter: 'brightness(1.06) drop-shadow(0 0 7px rgba(191,255,0,0.5))',
    zIndex: 20,
  };
}
