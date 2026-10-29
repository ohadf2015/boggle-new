'use client';

import { memo, useEffect, useState } from 'react';
import { DIAMOND_WORD_MULTIPLIER, GOLD_MULTIPLIER, type BlastTileType } from './types';
import { BlastTileFaceArt } from './board/BlastTileFaceArt';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTileTooltip } from './utils/blastTileTooltips';
import { TILE_VISUALS } from './blastTileVisuals';
import { getPhaseStyles, getSelectionStyles } from './blastCascadeStyle';

/* Dark letters on light faces: a crisp (blur-free) light emboss — the old
 * blurred drop shadow smeared the glyph edges at small sizes. */
const TILE_LETTER_DARK_STYLE = { textShadow: '0 1.5px 0 rgba(255,255,255,0.55)' } as const;
/* White letters sit on saturated faces (red, pink, violet, teal…) where plain
 * white is low-contrast. An ink outline + hard ink drop makes them read as a
 * sticker on ANY face. paint-order keeps the stroke outside the fill. */
const TILE_LETTER_LIGHT_STYLE = {
  WebkitTextStroke: '0.09em #0b1530',
  paintOrder: 'stroke fill',
  textShadow: '0 0.07em 0 #0b1530',
} as const;

export type TilePhase = 'idle' | 'selected' | 'anticipation' | 'clearing' | 'falling' | 'appearing' | 'landing';

export interface BlastTileProps {
  letter: string;
  type: BlastTileType;
  phase: TilePhase;
  isSelected: boolean;
  isCleared: boolean;
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
  /** Activation effect from game engine (tile-earned, diamond-spawn, etc.) */
  activationEffect?: string | null;
  /** Combo preview — this tile will participate in a combo if the word is submitted */
  isComboPreview?: boolean;
  /** Selection index in the current word path (0-based, undefined if not selected) */
  selectionIndex?: number;
  /** Total selected tiles in current word */
  selectionTotal?: number;
  /** Zone preview type — shows effect radius indicator when tile is selected */
  zonePreview?: 'bomb' | null;
  /** Cascade highlight — tile is about to be cleared by a cascade chain reaction */
  isCascadeHighlight?: boolean;
  /** Color tag for color_power objectives (pink/cyan/lime) — applies pulsing glow */
  colorTag?: 'pink' | 'cyan' | 'lime';
  /**
   * Suppress the special-tile explanation tooltip (the native `title` hint). Used
   * in multiplayer where the per-tile descriptions are distracting during a timed,
   * competitive round — players already know the mechanics by the time they're in
   * MP. Single-player keeps them as a learning aid.
   */
  hideTooltip?: boolean;
  onClick?: () => void;
}

/** Value badges: both coins and diamonds multiply the word they are played in */
const VALUE_BADGES: Partial<Record<BlastTileType, { label: string; tone: string }>> = {
  gold: { label: `×${GOLD_MULTIPLIER}`, tone: 'text-neo-yellow' },
  diamond: { label: `×${DIAMOND_WORD_MULTIPLIER}`, tone: 'text-neo-cyan' },
};

/** Letters that get a rare glow effect — high Scrabble-value letters */
const RARE_LETTERS = new Set(['Q', 'Z', 'X', 'J']);

const ANIMATED_PHASES = new Set<TilePhase>(['anticipation', 'clearing', 'falling', 'appearing', 'landing']);

function getPhaseClasses(phase: TilePhase, isSelected: boolean): string {
  if (phase === 'selected' || (phase === 'idle' && isSelected)) {
    // The selection ring + lift + hard shadow are applied INLINE
    // (getSelectionStyles) so they layer over each special tile's own face
    // instead of replacing it. Here we add only the one-shot "pop" keyframe.
    return 'blast-tile-select-pop';
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

export const BlastTile = memo(function BlastTile({
  letter, type, phase, isSelected, isCleared,
  fallOffset, clearRotate, spawnOffset, isNearMiss, activationEffect, isComboPreview,
  selectionIndex, selectionTotal, zonePreview,
  isCascadeHighlight, colorTag, hideTooltip, onClick, col,
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
  // never a playable white square. Specials carry an icon, so only `standard` counts.
  const isEmptyStandard = type === 'standard' && letter === '';
  if (isEmptyStandard || (isCleared && !isAnimatingClear)) {
    return <div className="aspect-square opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;
  // Skip tooltip lookup entirely for standard tiles (the vast majority) — keeps
  // render fast — and in multiplayer where the explanations are suppressed.
  const tooltip = type !== 'standard' && !hideTooltip ? getTileTooltip(type, t) : null;
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
        if (name === 'blast-tile-birth') {
          setLiveActivationEffect(null);
        }
      }}
      className={[
        'blast-tile-face relative aspect-square flex items-center justify-center',
        'rounded-neo',
        'font-neo-display font-black uppercase',
        'select-none',
        // Only apply CSS transition + active press when idle/selected — animated phases use keyframes
        ...(effectivePhase === 'idle' || effectivePhase === 'selected'
          ? ['transition-transform duration-100', 'active:scale-95 active:translate-y-[2px] active:brightness-110']
          : []),
        visual.bg,
        visual.text ?? 'text-neo-navy',
        type !== 'standard' ? `blast-tile-${type}` : '',
        liveActivationEffect === 'tile-earned' || liveActivationEffect === 'diamond-spawn' ? 'blast-tile-earned' : '',
        RARE_LETTERS.has(letter.toUpperCase()) ? 'blast-rare-letter' : '',
        isComboPreview ? 'blast-combo-preview' : '',
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
      {/* Letter size lives on this CHILD span: `cqw` resolves against the nearest
          ANCESTOR container, so on the button itself it never saw the tile (the
          1.1rem floor always bound — 17.6px on a 53px tile). Here 54cqw is a
          share of the tile width, so the letter scales from phone to TV. */}
      <span
        data-testid="blast-tile-letter"
        // Specials: me-[18cqw] nudges the centred letter ~9cqw toward the START edge,
        // clear of the corner type chip. Logical margin, so it flips for RTL.
        className={`relative z-10 leading-none text-[clamp(1.2rem,60cqw,3.5rem)] ${visual.indicator ? 'me-[18cqw]' : ''}`}
        style={visual.text === 'text-white' ? TILE_LETTER_LIGHT_STYLE : TILE_LETTER_DARK_STYLE}
      >
        {letter}
      </span>
      <BlastTileFaceArt type={type} col={col ?? 0} />
      {visual.indicator && (
        /* Type icon on a solid navy chip in the corner: holds against every face
           (colour alone must not carry type identity) and no longer paints over
           the letter now that the letter fills the tile. */
        <span
          data-testid="blast-tile-type-chip"
          className="absolute top-0.5 inset-e-0.5 z-5 grid place-items-center rounded-full bg-neo-navy text-white w-[clamp(15px,30cqw,28px)] h-[clamp(15px,30cqw,28px)] pointer-events-none"
          aria-hidden="true"
        >
          <visual.indicator className="w-[62%] h-[62%]" strokeWidth={2.75} />
        </span>
      )}
      {VALUE_BADGES[type] && (
        <span
          data-testid="blast-tile-value"
          className={`absolute bottom-[8%] inset-e-0.5 z-10 text-[clamp(0.6rem,22cqw,0.95rem)] font-neo-display font-black bg-neo-navy rounded px-1 leading-tight tabular-nums ${VALUE_BADGES[type]!.tone}`}
          aria-hidden="true"
        >
          {VALUE_BADGES[type]!.label}
        </span>
      )}
      {zonePreview && isSelected && (
        <span
          data-testid="zone-preview"
          className="absolute inset-0 rounded-neo pointer-events-none z-20 border-2 border-dashed border-red-400/70 bg-red-500/10"
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
  prev.fallOffset === next.fallOffset &&
  prev.col === next.col &&
  prev.clearRotate === next.clearRotate &&
  prev.spawnOffset === next.spawnOffset &&
  prev.isNearMiss === next.isNearMiss &&
  prev.activationEffect === next.activationEffect &&
  prev.isComboPreview === next.isComboPreview &&
  prev.selectionIndex === next.selectionIndex &&
  prev.selectionTotal === next.selectionTotal &&
  prev.zonePreview === next.zonePreview &&
  prev.isCascadeHighlight === next.isCascadeHighlight &&
  prev.colorTag === next.colorTag &&
  prev.hideTooltip === next.hideTooltip &&
  prev.onClick === next.onClick
);

export default BlastTile;
