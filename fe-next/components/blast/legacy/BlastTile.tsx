'use client';

import { memo, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { BlastTileType } from './types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTileTooltip } from './utils/blastTileTooltips';
import { TILE_VISUALS, CLEARING_COLORS, CLEARING_ANIMS } from './blastTileVisuals';
import { getCascadeFallStyle } from './blastCascadeStyle';
import { BlastJellyOverlay } from './BlastJellyOverlay';
import { BlastCakeOverlay } from './BlastCakeOverlay';
import { BlastChocolateOverlay } from './BlastChocolateOverlay';

const TILE_TEXT_SHADOW_STYLE = { textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 2px 3px rgba(0,0,0,0.2)' } as const;
const TILE_TEXT_SHADOW_LIGHT_STYLE = { textShadow: '0 1px 2px rgba(0,0,0,0.4)' } as const;

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
  /** Tile column (0-based) — drives per-column cascade stagger so columns ripple */
  col?: number;
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
  /** Fuse timer — set once partner is cleared; undefined = unlit (fuse tile only) */
  fuseTimer?: number;
  /** Zone preview type — shows effect radius indicator when tile is selected */
  zonePreview?: 'bomb' | 'lightning' | 'prism' | 'magnet' | null;
  /** Diamond reveal: shows inner type indicator on frozen tiles */
  isDiamondRevealed?: boolean;
  /** The hidden inner type of a frozen tile */
  innerType?: BlastTileType;
  /** Cascade highlight — tile is about to be cleared by a cascade chain reaction */
  isCascadeHighlight?: boolean;
  /** Portal pair color index (0-based) — portals with the same index are linked */
  portalPairIndex?: number;
  /** Rainbow scan target — this tile will be copied by rainbow */
  isScanTarget?: 'rainbow';
  /** Color tag for color_power objectives (pink/cyan/lime) — applies pulsing glow */
  colorTag?: 'pink' | 'cyan' | 'lime';
  /** Jelly layers beneath this cell for clear_jelly objective. Undefined/0 = no jelly. */
  jellyLayers?: number;
  /** Cake-bomb HP for the kill_cake objective. Set on the anchor cell only. */
  cakeHp?: number;
  /** Cake-bomb max HP — drives the pip-ring length. */
  cakeMaxHp?: number;
  /** True if this tile is part of any cake-bomb cluster (renders the pink wash). */
  isCakeCell?: boolean;
  onClick?: () => void;
}

/** Multiplier badges for score-multiplier tiles */
const MULTIPLIER_BADGES: Partial<Record<BlastTileType, string>> = {
  gold: '×3',
  diamond: '×5',
};

/** Portal pair colors — each pair gets a distinct dot color */
const PORTAL_PAIR_COLORS = ['#FF6B9D', '#00E5FF', '#FFD700', '#B388FF', '#69F0AE'];

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

function getPhaseStyles(phase: TilePhase, type: BlastTileType, fallOffset?: number, clearRotate?: number, spawnOffset?: number, col?: number): React.CSSProperties {
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
      return getCascadeFallStyle(dist, col ?? 0);
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

/**
 * Compute progressive selection scale: first tile 1.05x, last tile 1.12x.
 */
function getSelectionScale(selectionIndex?: number, selectionTotal?: number): number {
  if (selectionIndex == null || !selectionTotal || selectionTotal <= 1) return 1.05;
  const t = selectionIndex / (selectionTotal - 1);
  // Round to 3 decimals to avoid floating point noise
  return Math.round((1.05 + t * 0.07) * 1000) / 1000;
}

function getPhaseClasses(phase: TilePhase, isSelected: boolean): string {
  if (phase === 'selected' || (phase === 'idle' && isSelected)) {
    return `ring-3 ring-neo-lime ring-offset-2 ring-offset-neo-navy shadow-hard-lime blast-tile-select-pop`;
  }
  return '';
}

/** Color tag glow class for color_power objectives */
function getColorTagGlow(colorTag?: 'pink' | 'cyan' | 'lime'): string {
  if (!colorTag) return '';
  const colorMap: Record<string, string> = {
    pink: 'ring-2 ring-neo-pink animate-pulse',
    cyan: 'ring-2 ring-neo-cyan animate-pulse',
    lime: 'ring-2 ring-neo-lime animate-pulse',
  };
  return colorMap[colorTag] || '';
}

/** Inline styles for selected tiles: progressive scale */
function getSelectionStyles(isSelected: boolean, selectionIndex?: number, selectionTotal?: number): React.CSSProperties {
  if (!isSelected) return {};
  const scale = getSelectionScale(selectionIndex, selectionTotal);
  return { transform: `scale(${scale})` };
}


export const BlastTile = memo(function BlastTile({
  letter, type, phase, isSelected, isCleared, hitsRemaining,
  fallOffset, clearRotate, spawnOffset, isNearMiss, activationEffect, isComboPreview,
  selectionIndex, selectionTotal, isLocked, countdown, fuseTimer, zonePreview,
  isDiamondRevealed, innerType, isCascadeHighlight, portalPairIndex, isScanTarget, colorTag, jellyLayers, cakeHp, cakeMaxHp, isCakeCell, onClick, col,
}: BlastTileProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { t } = useLanguage();

  // Track which activation effect is currently "live" (animation in flight).
  // CSS keyframes use `animation-fill-mode: forwards`, so if we keep the class on the
  // element after the animation finishes, the final frame freezes on screen permanently.
  // We clear the live flag in `onAnimationEnd` (below) so the class drops off cleanly.
  const [liveActivationEffect, setLiveActivationEffect] = useState<string | null>(activationEffect ?? null);
  useEffect(() => {
    if (activationEffect) setLiveActivationEffect(activationEffect);
  }, [activationEffect]);

  // Allow clearing/anticipation phases to render even when isCleared is true —
  // during cascade chains, submitWord marks tiles cleared BEFORE the animation runs.
  // Without this, cascade clearing animations never play (tile goes invisible instantly).
  const isAnimatingClear = phase === 'clearing' || phase === 'anticipation' || phase === 'falling' || phase === 'appearing';
  // An empty-letter `standard` tile is an empty cell with nothing to show —
  // never a playable white square. This also catches the invalid
  // {standard, isCleared:false, letter:''} state an interrupted magnet/vortex
  // letter-swap can strand (suspected root cause of "blank white tiles"; the
  // engine-side swap/grid desync is tracked separately). Specials carry an
  // icon rather than a letter, so only `standard` is treated as empty.
  const isEmptyStandard = type === 'standard' && letter === '';
  if (isEmptyStandard || (isCleared && !isAnimatingClear)) {
    return <div className="aspect-square opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;
  // Skip tooltip lookup entirely for standard tiles (the vast majority) — keeps render fast
  const tooltip = type !== 'standard' ? getTileTooltip(type, t) : null;
  const effectivePhase = reducedMotion && ANIMATED_PHASES.has(phase) ? 'idle' : phase;
  const phaseStyle = effectivePhase !== 'idle' && effectivePhase !== 'selected'
    ? getPhaseStyles(effectivePhase, type, fallOffset, clearRotate, spawnOffset, col)
    : {};
  const selectionStyle = getSelectionStyles(isSelected, selectionIndex, selectionTotal);
  // Narrow willChange to the property the current phase actually animates — avoid forcing
  // unnecessary compositor layers for idle tiles.
  let willChangeValue: string | undefined;
  if (effectivePhase === 'clearing' || effectivePhase === 'appearing') {
    willChangeValue = 'transform, opacity';
  } else if (effectivePhase === 'falling' || effectivePhase === 'landing' || isSelected) {
    willChangeValue = 'transform';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onAnimationEnd={(e) => {
        // Clear the live activation-effect flag when its own keyframe finishes.
        // Name-guarding prevents other keyframes (falling, appearing, etc.) from clearing it.
        const name = e.animationName;
        if (name === 'blast-frost-shatter' || name === 'blast-tile-birth' || name === 'blast-shuffle-rearrange') {
          setLiveActivationEffect(null);
        }
      }}
      className={[
        'relative aspect-square flex items-center justify-center',
        'rounded-neo',
        'font-neo-display text-[clamp(1.1rem,4.5cqw,1.85rem)] font-black uppercase',
        'select-none',
        // Only apply CSS transition + active press when idle/selected — animated phases use keyframes
        ...(effectivePhase === 'idle' || effectivePhase === 'selected'
          ? ['transition-transform duration-100', 'active:scale-95 active:translate-y-[2px] active:brightness-110']
          : []),
        visual.bg,
        visual.text ?? 'text-neo-navy',
        type !== 'standard' ? `blast-tile-${type}` : '',
        getCrackClass(type, hitsRemaining),
        getSpecialEffectClasses(type, phase, hitsRemaining),
        liveActivationEffect === 'frost-free' ? 'blast-tile-frost-shatter' : '',
        liveActivationEffect === 'tile-earned' ? 'blast-tile-earned' : '',
        liveActivationEffect === 'shuffle-rearrange' ? 'blast-tile-shuffle-rearrange' : '',
        (type === 'prism' && effectivePhase === 'clearing') ? 'blast-tile-prism-flash' : '',
        RARE_LETTERS.has(letter.toUpperCase()) ? 'blast-rare-letter' : '',
        isComboPreview ? 'blast-combo-preview' : '',
        isLocked ? 'blast-tile-locked' : '',
        isCascadeHighlight ? 'blast-tile-cascade-highlight' : '',
        isNearMiss ? 'ring-2 ring-neo-lime/80 animate-pulse' : '',
        getColorTagGlow(colorTag),
        getPhaseClasses(effectivePhase, isSelected),
      ].filter(Boolean).join(' ')}
      style={{
        ...(visual.style ?? {}),
        ...phaseStyle,
        ...selectionStyle,
        ...(willChangeValue && { willChange: willChangeValue }),
        containerType: 'inline-size',
      }}
      aria-label={`${letter}${type !== 'standard' ? ` ${type} tile` : ''}`}
      title={tooltip ? `${tooltip.name}: ${tooltip.desc}` : undefined}
    >
      <BlastJellyOverlay layers={jellyLayers ?? 0} />
      {isCakeCell && (
        <BlastCakeOverlay
          hp={cakeHp ?? cakeMaxHp ?? 5}
          maxHp={cakeMaxHp ?? 5}
          isAnchor={typeof cakeHp === 'number'}
        />
      )}
      <BlastChocolateOverlay active={type === 'chocolate'} />
      <span className="relative z-10" style={visual.text === 'text-white' ? TILE_TEXT_SHADOW_LIGHT_STYLE : TILE_TEXT_SHADOW_STYLE}>{letter}</span>
      {visual.indicator && (
        <span className={`absolute top-0.5 inset-e-0.5 leading-none pointer-events-none ${visual.text ?? ''}`} aria-hidden="true">
          <visual.indicator className="w-[clamp(11px,2.9cqw,17px)] h-[clamp(11px,2.9cqw,17px)]" strokeWidth={2.25} />
        </span>
      )}
      {hitsRemaining != null && hitsRemaining > 0 && (
        <span
          className="absolute bottom-0.5 inset-s-0.5 text-[clamp(0.4rem,1.5cqw,0.55rem)] font-neo-body font-semibold bg-white/60 rounded px-0.5 leading-tight"
          aria-label={`${hitsRemaining} hits remaining`}
        >
          {hitsRemaining}
        </span>
      )}
      {MULTIPLIER_BADGES[type] && (
        <span
          className="absolute bottom-0.5 inset-e-0.5 text-[clamp(0.35rem,1.3cqw,0.5rem)] font-neo-body font-bold bg-black/40 text-white rounded px-0.5 leading-tight"
          aria-hidden="true"
        >
          {MULTIPLIER_BADGES[type]}
        </span>
      )}
      {type === 'gem' && hitsRemaining != null && hitsRemaining > 0 && (
        <span
          data-testid="gem-shards"
          className="absolute top-0.5 inset-s-0.5 flex gap-px pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 3 }, (_, i) => {
            const filled = i < (3 - hitsRemaining);
            return (
              <span
                key={`shard-${i}`}
                className={`w-1.5 h-1.5 rounded-full border border-white/40 ${filled ? 'bg-white/80' : 'bg-white/20'}`}
              />
            );
          })}
        </span>
      )}
      {type === 'countdown' && countdown != null && (
        <span
          data-testid="countdown-badge"
          className={`absolute bottom-0.5 inset-s-0.5 text-[clamp(0.5rem,2cqw,0.7rem)] font-neo-body font-bold rounded px-0.5 leading-tight ${
            countdown <= 1 ? 'bg-red-500/80 text-white animate-pulse' : 'bg-orange-400/70 text-white'
          }`}
          aria-label={`${countdown} moves until explosion`}
        >
          {countdown}
        </span>
      )}
      {type === 'fuse' && fuseTimer != null && (
        <span
          data-testid="fuse-badge"
          className={`absolute bottom-0.5 inset-s-0.5 text-[clamp(0.5rem,2cqw,0.7rem)] font-neo-body font-bold rounded px-0.5 leading-tight ${
            fuseTimer <= 1 ? 'bg-red-600/90 text-white animate-pulse' : 'bg-orange-500/80 text-white'
          }`}
          aria-label={`${fuseTimer} moves until fuse detonation`}
        >
          {fuseTimer}
        </span>
      )}
      {type === 'portal' && portalPairIndex != null && (
        <span
          data-testid="portal-pair-badge"
          className="absolute bottom-0.5 inset-s-0.5 w-2.5 h-2.5 rounded-full border border-white/50 pointer-events-none"
          style={{ background: PORTAL_PAIR_COLORS[portalPairIndex % PORTAL_PAIR_COLORS.length] }}
          aria-hidden="true"
        />
      )}
      {isScanTarget && (
        <span
          data-testid="scan-target"
          className={`absolute inset-0 rounded-neo pointer-events-none z-15 border-2 border-dashed ${
            isScanTarget === 'rainbow' ? 'border-yellow-300/80 bg-yellow-400/10' : 'border-pink-300/80 bg-pink-400/10'
          }`}
          aria-hidden="true"
        />
      )}
      {isLocked && type === 'locked' && (
        /* Corner badge: letter stays fully visible; only a small lock icon hints
           the tile is unselectable until a nearby key is collected. */
        <span
          data-testid="locked-overlay"
          className="absolute inset-0 rounded-neo pointer-events-none z-20 bg-blue-900/15 border border-blue-400/25"
          aria-hidden="true"
        >
          <Lock
            className="absolute top-0.5 inset-e-0.5 w-[clamp(7px,1.8cqw,11px)] h-[clamp(7px,1.8cqw,11px)] text-cyan-200/80"
            strokeWidth={2.5}
          />
        </span>
      )}
      {isLocked && type !== 'locked' && (
        /* Full overlay for ice/frozen — legitimately hides inner tile until thawed,
           or reveals it with a diamond glow when the lock is close to breaking. */
        <span
          data-testid="locked-overlay"
          className={`absolute inset-0 rounded-neo pointer-events-none z-20 flex flex-col items-center justify-center gap-0 ${
            isDiamondRevealed ? 'bg-white/15 border-2 border-dashed border-cyan-300/50' : 'bg-blue-900/40'
          }`}
          aria-hidden="true"
        >
          {isDiamondRevealed && innerType ? (
            (() => {
              const InnerIcon = TILE_VISUALS[innerType]?.indicator;
              return (
                <span className={`animate-pulse drop-shadow-[0_0_4px_rgba(0,255,255,0.6)] ${TILE_VISUALS[innerType]?.text ?? ''}`}>
                  {InnerIcon ? <InnerIcon className="w-[clamp(12px,3.2cqw,20px)] h-[clamp(12px,3.2cqw,20px)]" strokeWidth={2.5} /> : '?'}
                </span>
              );
            })()
          ) : (
            <span className="blast-lock-hint flex flex-col items-center">
              <Lock className="w-[clamp(10px,2.6cqw,16px)] h-[clamp(10px,2.6cqw,16px)] text-white/90" strokeWidth={2.5} />
              {type === 'frozen' && innerType ? (
                (() => {
                  const InnerIcon = TILE_VISUALS[innerType]?.indicator;
                  return (
                    <span className={`opacity-30 blur-[1px] leading-none -mt-px ${TILE_VISUALS[innerType]?.text ?? ''}`}>
                      {InnerIcon ? <InnerIcon className="w-[clamp(8px,1.8cqw,11px)] h-[clamp(8px,1.8cqw,11px)]" strokeWidth={2.5} /> : '?'}
                    </span>
                  );
                })()
              ) : (
                <span className="text-[clamp(0.3rem,1.2cqw,0.45rem)] text-cyan-200/80 font-neo-body leading-none -mt-px">
                  {t('blast.tileNearby')}
                </span>
              )}
            </span>
          )}
        </span>
      )}
      {zonePreview && isSelected && (
        <span
          data-testid="zone-preview"
          className={[
            'absolute inset-0 rounded-neo pointer-events-none z-20 border-2 border-dashed',
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
  prev.fuseTimer === next.fuseTimer &&
  prev.fallOffset === next.fallOffset &&
  prev.col === next.col &&
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
  prev.isCascadeHighlight === next.isCascadeHighlight &&
  prev.portalPairIndex === next.portalPairIndex &&
  prev.isScanTarget === next.isScanTarget &&
  prev.onClick === next.onClick
);

export default BlastTile;
