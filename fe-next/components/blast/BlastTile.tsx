'use client';

import { memo } from 'react';
import type { BlastTileType } from './types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTileTooltip } from './utils/blastTileTooltips';
import { TILE_VISUALS, CLEARING_COLORS, CLEARING_ANIMS } from './blastTileVisuals';

export type TilePhase = 'idle' | 'selected' | 'anticipation' | 'clearing' | 'falling' | 'appearing' | 'landing';

export interface BlastTileProps {
  letter: string;
  type: BlastTileType;
  phase: TilePhase;
  isSelected: boolean;
  isCleared: boolean;
  hitsRemaining?: number;
  /** Fall distance in pixels (set by sequencer for falling phase) */
  fallOffset?: number;
  /** Random rotation for clearing phase (-12 to 12 degrees) */
  clearRotate?: number;
  /** Spawn offset in pixels for appearing phase */
  spawnOffset?: number;
  /** Near-miss shimmer — tile was adjacent to path and could have formed a combo */
  isNearMiss?: boolean;
  /** Activation effect from game engine (frost-free, tile-earned, etc.) */
  activationEffect?: string | null;
  /** Combo preview — this tile will participate in a combo if the word is submitted */
  isComboPreview?: boolean;
  /** Selection index in the current word path (0-based, undefined if not selected) */
  selectionIndex?: number;
  /** Total selected tiles in current word */
  selectionTotal?: number;
  /** Whether this tile is locked (unthawed ice/frozen — not selectable) */
  isLocked?: boolean;
  /** Countdown moves remaining (countdown tile only) */
  countdown?: number;
  /** Zone preview type — shows effect radius indicator when tile is selected */
  zonePreview?: 'bomb' | 'lightning' | 'prism' | 'magnet' | null;
  /** Diamond reveal: shows inner type indicator on frozen tiles */
  isDiamondRevealed?: boolean;
  /** The hidden inner type of a frozen tile */
  innerType?: BlastTileType;
  onClick?: () => void;
}

/** Multiplier badges for score-multiplier tiles */
const MULTIPLIER_BADGES: Partial<Record<BlastTileType, string>> = {
  silver: '×1.5',
  gold: '×3',
  diamond: '×5',
};

/** Multi-hit tiles: initial hit counts for crack state calculation */
const MULTI_HIT_MAX: Partial<Record<BlastTileType, number>> = {
  ice: 2,
  prism: 2,
  gem: 3,
  frozen: 2,
};

/**
 * Returns crack-state CSS class based on damage progression.
 * - "cracked": tile has taken damage but isn't about to break
 * - "critical": tile is one hit from breaking (gem only, since gem has 3 max hits)
 */
function getCrackClass(type: BlastTileType, hitsRemaining?: number): string {
  const maxHits = MULTI_HIT_MAX[type];
  if (!maxHits || hitsRemaining == null || hitsRemaining >= maxHits) return '';
  if (hitsRemaining <= 1 && maxHits >= 3) return 'blast-tile-critical';
  if (hitsRemaining < maxHits) return 'blast-tile-cracked';
  return '';
}

/** Type-specific visual effect classes for gem/frozen/ice tiles */
function getSpecialEffectClasses(type: BlastTileType, phase: TilePhase, hitsRemaining?: number): string {
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

/** Letters that get a rare glow effect — high Scrabble-value letters */
const RARE_LETTERS = new Set(['Q', 'Z', 'X', 'J']);

const ANIMATED_PHASES = new Set<TilePhase>(['anticipation', 'clearing', 'falling', 'appearing', 'landing']);

function getPhaseStyles(phase: TilePhase, type: BlastTileType, fallOffset?: number, clearRotate?: number, spawnOffset?: number): React.CSSProperties {
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
      // Tile is at its destination row; CSS keyframe animates FROM --fall-from TO 0
      const dist = fallOffset ?? 0;
      return {
        animation: `blastTileFall 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        '--fall-from': `-${dist}px`,
      } as React.CSSProperties;
    }
    case 'appearing':
      return {
        '--spawn-from': `${-(spawnOffset ?? 40)}px`,
        opacity: 0,
        animation: 'blastTileAppear 200ms ease-out forwards',
      } as React.CSSProperties;
    case 'landing':
      return {
        transform: 'scaleY(1.15) scaleX(0.88)',
        transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    default:
      return {};
  }
}

/**
 * Compute progressive selection scale: first tile 1.05x, last tile 1.12x.
 */
function getSelectionScale(selectionIndex?: number, selectionTotal?: number): number {
  if (selectionIndex == null || !selectionTotal || selectionTotal <= 1) return 1.05;
  const t = selectionIndex / (selectionTotal - 1);
  // Round to 3 decimals to avoid floating point noise
  return Math.round((1.05 + t * 0.07) * 1000) / 1000;
}

function getPhaseClasses(phase: TilePhase, isSelected: boolean, selectionIndex?: number, selectionTotal?: number): string {
  if (phase === 'selected' || (phase === 'idle' && isSelected)) {
    // Intensify glow based on position in word — later tiles glow brighter
    const intensity = (selectionIndex != null && selectionTotal && selectionTotal > 1)
      ? Math.min(0.4 + (selectionIndex / (selectionTotal - 1)) * 0.6, 1.0)
      : 0.6;
    const glowSize = Math.round(10 + intensity * 14);
    return `ring-3 ring-neo-lime ring-offset-2 ring-offset-neo-navy shadow-[0_0_${glowSize}px_rgba(191,255,0,${intensity}),0_0_${glowSize + 6}px_rgba(191,255,0,${(intensity * 0.4).toFixed(2)})] blast-tile-select-pop`;
  }
  return '';
}

/** Inline styles for selected tiles: progressive scale */
function getSelectionStyles(isSelected: boolean, selectionIndex?: number, selectionTotal?: number): React.CSSProperties {
  if (!isSelected) return {};
  const scale = getSelectionScale(selectionIndex, selectionTotal);
  return { transform: `scale(${scale})` };
}

/**
 * Strip glow/spread shadows (0 0 Xpx ...) from boxShadow for low-end devices.
 * Keeps structural shadows: inset highlights, bottom-edge depth (Y offset > 0).
 */
function stripGlowShadows(boxShadow: string): string {
  return boxShadow
    .split(',')
    .map(s => s.trim())
    .filter(s => {
      // Keep inset shadows (structural highlights)
      if (s.startsWith('inset')) return true;
      // Parse: "Xpx Ypx ..." — keep if Y offset > 0 (bottom edge shadow)
      const nums = s.match(/-?\d+/g);
      if (nums && nums.length >= 2 && parseInt(nums[1]) > 0) return true;
      // Drop glow shadows (0 0 Xpx rgba(...))
      return false;
    })
    .join(', ');
}


export const BlastTile = memo(function BlastTile({
  letter, type, phase, isSelected, isCleared, hitsRemaining,
  fallOffset, clearRotate, spawnOffset, isNearMiss, activationEffect, isComboPreview,
  selectionIndex, selectionTotal, isLocked, countdown, zonePreview,
  isDiamondRevealed, innerType, onClick,
}: BlastTileProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { enableGlowEffects } = useDevicePerformance();
  const { t } = useLanguage();

  if (isCleared) {
    return <div className="aspect-square opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;
  const tooltip = getTileTooltip(type, t);
  const effectivePhase = reducedMotion && ANIMATED_PHASES.has(phase) ? 'idle' : phase;
  const phaseStyle = effectivePhase !== 'idle' && effectivePhase !== 'selected'
    ? getPhaseStyles(effectivePhase, type, fallOffset, clearRotate, spawnOffset)
    : {};
  const selectionStyle = getSelectionStyles(isSelected, selectionIndex, selectionTotal);
  const needsWillChange = ANIMATED_PHASES.has(effectivePhase) || isSelected;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative aspect-square flex items-center justify-center',
        'border-3 border-neo-black rounded-xl',
        'font-neo-display text-[clamp(1.1rem,4.5cqw,1.85rem)] font-black uppercase',
        'transition-transform duration-100 select-none',
        'active:scale-95 active:translate-y-[2px] active:brightness-110',
        visual.bg,
        visual.text ?? 'text-neo-navy',
        type !== 'standard' ? `blast-tile-${type}` : '',
        getCrackClass(type, hitsRemaining),
        getSpecialEffectClasses(type, phase, hitsRemaining),
        activationEffect === 'frost-free' ? 'blast-tile-frost-shatter' : '',
        activationEffect === 'tile-earned' ? 'blast-tile-earned' : '',
        activationEffect === 'virus-spread' ? 'blast-tile-virus-spread' : '',
        (type === 'prism' && effectivePhase === 'clearing') ? 'blast-tile-prism-flash' : '',
        RARE_LETTERS.has(letter.toUpperCase()) ? 'blast-rare-letter' : '',
        isComboPreview ? 'blast-combo-preview' : '',
        isLocked ? 'blast-tile-locked' : '',
        isNearMiss ? 'ring-2 ring-neo-lime/80 animate-pulse' : '',
        getPhaseClasses(effectivePhase, isSelected, selectionIndex, selectionTotal),
      ].filter(Boolean).join(' ')}
      style={{
        ...(visual.style ?? {}),
        ...(!enableGlowEffects && visual.style?.boxShadow && {
          boxShadow: stripGlowShadows(visual.style.boxShadow as string),
        }),
        ...phaseStyle,
        ...selectionStyle,
        ...(needsWillChange && { willChange: 'transform, opacity' }),
        containerType: 'inline-size',
      }}
      aria-label={`${letter}${type !== 'standard' ? ` ${type} tile` : ''}`}
      title={tooltip ? `${tooltip.name}: ${tooltip.desc}` : undefined}
    >
      <span className="relative z-10" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{letter}</span>
      {visual.indicator && (
        <span className="absolute top-0.5 end-0.5 text-[clamp(0.45rem,1.8cqw,0.65rem)] leading-none pointer-events-none" aria-hidden="true">
          {visual.indicator}
        </span>
      )}
      {hitsRemaining != null && hitsRemaining > 0 && (
        <span
          className="absolute bottom-0.5 start-0.5 text-[clamp(0.4rem,1.5cqw,0.55rem)] font-neo-body font-semibold bg-white/60 rounded px-0.5 leading-tight"
          aria-label={`${hitsRemaining} hits remaining`}
        >
          {hitsRemaining}
        </span>
      )}
      {MULTIPLIER_BADGES[type] && (
        <span
          className="absolute bottom-0.5 end-0.5 text-[clamp(0.35rem,1.3cqw,0.5rem)] font-neo-body font-bold bg-black/40 text-white rounded px-0.5 leading-tight"
          aria-hidden="true"
        >
          {MULTIPLIER_BADGES[type]}
        </span>
      )}
      {type === 'gem' && hitsRemaining != null && hitsRemaining > 0 && (
        <span
          data-testid="gem-shards"
          className="absolute top-0.5 start-0.5 flex gap-px pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 3 }, (_, i) => {
            const filled = i < (3 - hitsRemaining);
            return (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full border border-white/40 ${filled ? 'bg-white/80' : 'bg-white/20'}`}
              />
            );
          })}
        </span>
      )}
      {type === 'countdown' && countdown != null && (
        <span
          data-testid="countdown-badge"
          className={`absolute bottom-0.5 start-0.5 text-[clamp(0.5rem,2cqw,0.7rem)] font-neo-body font-bold rounded px-0.5 leading-tight ${
            countdown <= 1 ? 'bg-red-500/80 text-white animate-pulse' : 'bg-orange-400/70 text-white'
          }`}
          aria-label={`${countdown} moves until explosion`}
        >
          {countdown}
        </span>
      )}
      {isLocked && (
        <span
          data-testid="locked-overlay"
          className={`absolute inset-0 rounded-xl pointer-events-none z-20 flex items-center justify-center ${
            isDiamondRevealed ? 'bg-white/15 border-2 border-dashed border-cyan-300/50' : 'bg-white/30 backdrop-blur-[1px]'
          }`}
          aria-hidden="true"
        >
          {isDiamondRevealed && innerType ? (
            <span className="text-[clamp(0.7rem,3cqw,1.1rem)] animate-pulse drop-shadow-[0_0_4px_rgba(0,255,255,0.6)]">
              {TILE_VISUALS[innerType]?.indicator ?? '?'}
            </span>
          ) : (
            <span className="text-[clamp(0.6rem,2.5cqw,1rem)]">🔒</span>
          )}
        </span>
      )}
      {zonePreview && isSelected && (
        <span
          data-testid="zone-preview"
          className={[
            'absolute inset-0 rounded-xl pointer-events-none z-20 border-2 border-dashed',
            zonePreview === 'bomb' ? 'border-red-400/70 bg-red-500/10' : '',
            zonePreview === 'lightning' ? 'border-yellow-400/70 bg-yellow-500/10' : '',
            zonePreview === 'prism' ? 'border-purple-400/70 bg-purple-500/10' : '',
            zonePreview === 'magnet' ? 'border-cyan-400/70 bg-cyan-500/10' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        />
      )}
    </button>
  );
}, (prev, next) =>
  prev.letter === next.letter &&
  prev.type === next.type &&
  prev.phase === next.phase &&
  prev.isSelected === next.isSelected &&
  prev.isCleared === next.isCleared &&
  prev.hitsRemaining === next.hitsRemaining &&
  prev.countdown === next.countdown &&
  prev.fallOffset === next.fallOffset &&
  prev.clearRotate === next.clearRotate &&
  prev.spawnOffset === next.spawnOffset &&
  prev.isNearMiss === next.isNearMiss &&
  prev.activationEffect === next.activationEffect &&
  prev.isComboPreview === next.isComboPreview &&
  prev.selectionIndex === next.selectionIndex &&
  prev.selectionTotal === next.selectionTotal &&
  prev.isLocked === next.isLocked &&
  prev.zonePreview === next.zonePreview &&
  prev.isDiamondRevealed === next.isDiamondRevealed &&
  prev.innerType === next.innerType &&
  prev.onClick === next.onClick
);

export default BlastTile;
