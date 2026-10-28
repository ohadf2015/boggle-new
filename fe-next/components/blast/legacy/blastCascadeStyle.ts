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
      if (!clearingAnim) {
        return {
          background: CHARGE_LIME,
          animation: 'blastTilePop 300ms cubic-bezier(0.3, 0, 0.7, 1) forwards',
          '--pop-rot': `${(clearRotate ?? 0) * 3}deg`,
        } as CSSProperties;
      }
      return {
        transform: clearingAnim.transform,
        opacity: 0,
        filter: clearingAnim.filter,
        transition: clearingAnim.transition,
        ...(clearing && { background: clearing.background, border: clearing.border }),
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

function getSelectionScale(selectionIndex?: number, selectionTotal?: number): number {
  if (selectionIndex == null || !selectionTotal || selectionTotal <= 1) return 1.03;
  const t = selectionIndex / (selectionTotal - 1);
  return Math.round((1.02 + t * 0.04) * 1000) / 1000;
}

/** The selected tile stays seated (the board's highlighter band lies over it); the ring carries the signal. */
export function getSelectionStyles(isSelected: boolean, selectionIndex?: number, selectionTotal?: number): CSSProperties {
  if (!isSelected) return {};
  return {
    transform: `scale(${getSelectionScale(selectionIndex, selectionTotal)})`,
    boxShadow: 'inset 0 0 0 3px #BFFF00, 0 0 0 2px #0b1530, 0 3px 0 0 rgba(11,21,48,0.92)',
    zIndex: 1,
  };
}
