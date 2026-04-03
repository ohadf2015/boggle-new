'use client';

import { memo } from 'react';
import type { BlastTileType } from './types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { getTileTooltip } from './utils/blastTileTooltips';

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

/**
 * AAA Royal Blast tile visuals — 3D candy-button treatment.
 * Each tile gets a top-to-bottom gradient for depth, specular inset highlight,
 * thick bottom shadow for physical height, and type-specific glow.
 * Colors use the LexiClash neo palette: lime, cyan, pink, purple, cream.
 */
const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: string; text?: string; style?: React.CSSProperties }> = {
  standard: {
    bg: '', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #FFFEF0 0%, #F5F0E0 40%, #E8DFC8 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #B8A88A, 0 6px 8px rgba(0,0,0,0.25)',
    },
  },
  gold: {
    bg: '', indicator: '✦', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 35%, #B8860B 100%)',
      boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #8B6914, 0 6px 12px rgba(255,215,0,0.3), 0 0 16px rgba(255,215,0,0.2)',
    },
  },
  bomb: {
    bg: '', indicator: '💣', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #FF6B6B 0%, #FF3366 40%, #CC0033 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,180,180,0.5), inset 0 -2px 4px rgba(0,0,0,0.25), 0 4px 0 #990022, 0 6px 10px rgba(255,51,102,0.3)',
    },
  },
  lightning: {
    bg: '', indicator: '⚡', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 40%, #00B3B3 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #008888, 0 6px 10px rgba(0,255,255,0.25), 0 0 12px rgba(0,255,255,0.15)',
    },
  },
  prism: {
    bg: '', indicator: '🔷', text: 'text-white',
    style: {
      background: 'conic-gradient(from 0deg, #FF1493, #8B5CF6, #00FFFF, #BFFF00, #FF1493)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #5B21B6, 0 6px 10px rgba(139,92,246,0.3)',
    },
  },
  rainbow: {
    bg: '', indicator: '🌈', text: 'text-white',
    style: {
      background: 'linear-gradient(135deg, #FF1493 0%, #8B5CF6 50%, #00FFFF 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #6B21A8, 0 6px 10px rgba(139,92,246,0.25)',
    },
  },
  ice: {
    bg: '', indicator: '❄', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #E0FFFF 0%, #99EEFF 40%, #66DDEE 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #44AABB, 0 6px 10px rgba(0,200,220,0.2)',
    },
  },
  gem: {
    bg: '', indicator: '💎', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #7DFFB3 0%, #34D399 40%, #059669 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #047857, 0 6px 10px rgba(52,211,153,0.25)',
    },
  },
  frozen: {
    bg: '', indicator: '🧊', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #E8F4FF 0%, #B8DDFF 40%, #88BBEE 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #6699BB, 0 6px 8px rgba(136,187,238,0.2)',
    },
  },
  magnet: {
    bg: '', indicator: '🌀', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 40%, #6D28D9 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #4C1D95, 0 6px 10px rgba(139,92,246,0.25)',
    },
  },
  mirror: {
    bg: '', indicator: '🪞', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #FFFEF0 0%, #E8E0D0 40%, #D0C8B8 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #A89880, 0 6px 8px rgba(200,190,170,0.3)',
    },
  },
  silver: {
    bg: '', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #E0E0E8 0%, #B0B0C0 40%, #8888A0 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.1), 0 4px 0 #606878, 0 6px 8px rgba(128,128,160,0.25)',
    },
  },
  diamond: {
    bg: '', indicator: '💠', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #88FFFF 0%, #00EEFF 40%, #00BBCC 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #008899, 0 6px 12px rgba(0,238,255,0.3), 0 0 14px rgba(0,255,255,0.2)',
    },
  },
};

/** Clearing phase background color per tile type */
const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '2px solid rgba(255,215,0,0.8)' },
  bomb:      { background: 'radial-gradient(circle, #FF4444 0%, #CC0000 100%)', border: '2px solid rgba(255,50,50,0.8)' },
  rainbow:   { background: 'linear-gradient(135deg, #FF69B4 0%, #A855F7 50%, #00BFFF 100%)', border: '2px solid rgba(168,85,247,0.8)' },
  ice:       { background: 'linear-gradient(135deg, #B4E6FF 0%, #82C8FF 100%)', border: '2px solid rgba(150,220,255,0.8)' },
  lightning: { background: 'linear-gradient(135deg, #FFE100 0%, #00BFFF 100%)', border: '2px solid rgba(255,225,0,0.8)' },
  prism:     { background: 'conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)', border: '2px solid rgba(255,255,255,0.8)' },
  gem:       { background: 'radial-gradient(circle, #50C878 0%, #009450 100%)', border: '2px solid rgba(80,200,120,0.8)' },
  frozen:    { background: 'linear-gradient(135deg, #C8DCFF 0%, #A0C8F0 100%)', border: '2px solid rgba(180,220,255,0.8)' },
  magnet:    { background: 'radial-gradient(circle, #8B00FF 0%, #FF0040 100%)', border: '2px solid rgba(139,0,255,0.8)' },
  mirror:    { background: 'radial-gradient(circle, #E0E0FF 0%, #8888FF 100%)', border: '2px solid rgba(136,136,255,0.8)' },
  silver:    { background: 'radial-gradient(circle, #E8E8E8 0%, #B0B0B0 100%)', border: '2px solid rgba(192,192,192,0.8)' },
  diamond:   { background: 'radial-gradient(circle, #B9F2FF 0%, #00CED1 100%)', border: '2px solid rgba(0,206,209,0.8)' },
};

/** Type-specific clearing transform overrides — visually distinct death animations.
 * Each type has a UNIQUE signature: bombs explode outward, ice shatters inward,
 * lightning stretches vertically, magnet implodes with spin, etc. */
const CLEARING_ANIMS: Partial<Record<BlastTileType, { transform: string; transition: string; filter?: string }>> = {
  bomb:      { transform: 'scale(2.2) rotate(15deg)', transition: 'all 200ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(2.5) saturate(2)' },
  lightning: { transform: 'scaleY(3.5) scaleX(0.15) translateY(-30%)', transition: 'all 140ms ease-in', filter: 'brightness(3) contrast(1.5)' },
  prism:     { transform: 'scale(2.0) rotate(270deg)', transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', filter: 'hue-rotate(180deg) brightness(1.8)' },
  ice:       { transform: 'scale(0.3) rotate(25deg) translateY(10px)', transition: 'all 180ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(2) blur(2px)' },
  frozen:    { transform: 'scale(0.1) rotate(-45deg)', transition: 'all 250ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(1.5) blur(3px)' },
  gem:       { transform: 'scale(1.8) rotate(90deg)', transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(2) saturate(3)' },
  gold:      { transform: 'scale(1.6) rotate(-20deg)', transition: 'all 200ms ease-out', filter: 'brightness(2.5) saturate(2)' },
  silver:    { transform: 'scale(1.3) translateY(-15px)', transition: 'all 180ms ease-out', filter: 'brightness(2)' },
  rainbow:   { transform: 'scale(2.0) rotate(540deg)', transition: 'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'hue-rotate(360deg) brightness(2)' },
  magnet:    { transform: 'scale(0.05) rotate(1080deg)', transition: 'all 300ms cubic-bezier(0.36, 0, 0.66, -0.56)', filter: 'brightness(0.3) saturate(3)' },
  mirror:    { transform: 'scaleX(0) scaleY(1.8)', transition: 'all 180ms ease-in', filter: 'brightness(3)' },
  diamond:   { transform: 'scale(1.9) rotate(45deg)', transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(3) saturate(2)' },
};

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
    case 'falling':
      return {
        transform: `translateY(${fallOffset ?? 0}px)`,
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    case 'appearing':
      return {
        transform: `translateY(${-(spawnOffset ?? 40)}px) scale(0)`,
        opacity: 0,
        animation: 'blastTileAppear 200ms ease-out forwards',
      };
    case 'landing':
      return {
        transform: 'scaleY(1.15) scaleX(0.88)',
        transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        animationFillMode: 'forwards',
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
    const glowSize = Math.round(8 + intensity * 12);
    return `ring-2 ring-neo-lime ring-offset-1 ring-offset-neo-navy shadow-[0_0_${glowSize}px_rgba(191,255,0,${intensity})] blast-tile-select-pop`;
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
  selectionIndex, selectionTotal, onClick,
}: BlastTileProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { enableGlowEffects } = useDevicePerformance();

  if (isCleared) {
    return <div className="aspect-square opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;
  const tooltip = getTileTooltip(type);
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
        (type === 'prism' && effectivePhase === 'clearing') ? 'blast-tile-prism-flash' : '',
        RARE_LETTERS.has(letter.toUpperCase()) ? 'blast-rare-letter' : '',
        isComboPreview ? 'blast-combo-preview' : '',
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
    </button>
  );
}, (prev, next) =>
  prev.letter === next.letter &&
  prev.type === next.type &&
  prev.phase === next.phase &&
  prev.isSelected === next.isSelected &&
  prev.isCleared === next.isCleared &&
  prev.hitsRemaining === next.hitsRemaining &&
  prev.fallOffset === next.fallOffset &&
  prev.clearRotate === next.clearRotate &&
  prev.spawnOffset === next.spawnOffset &&
  prev.isNearMiss === next.isNearMiss &&
  prev.activationEffect === next.activationEffect &&
  prev.isComboPreview === next.isComboPreview &&
  prev.selectionIndex === next.selectionIndex &&
  prev.selectionTotal === next.selectionTotal &&
  prev.onClick === next.onClick
);

export default BlastTile;
