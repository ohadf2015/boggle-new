'use client';

import { memo } from 'react';
import type { BlastTileType } from './types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

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
  onClick?: () => void;
}

/** Visual config per tile type: [gradient/bg classes, indicator emoji, text color override] */
const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: string; text?: string }> = {
  standard:  { bg: 'bg-neo-cream',                                                          text: 'text-neo-navy' },
  gold:      { bg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500',         indicator: '✦', text: 'text-neo-navy' },
  bomb:      { bg: 'bg-gradient-to-br from-red-500 via-red-600 to-orange-600',              indicator: '💣', text: 'text-white' },
  lightning: { bg: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-cyan-400',           indicator: '⚡', text: 'text-neo-navy' },
  prism:     { bg: 'bg-[conic-gradient(from_0deg,#FF69B4,#A855F7,#00BFFF,#FFD700,#FF69B4)]', indicator: '🔷', text: 'text-white' },
  rainbow:   { bg: 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-400',            indicator: '🌈', text: 'text-white' },
  ice:       { bg: 'bg-gradient-to-br from-sky-200 via-blue-200 to-sky-100',                indicator: '❄', text: 'text-blue-900' },
  gem:       { bg: 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600',       indicator: '💎', text: 'text-white' },
  frozen:    { bg: 'bg-gradient-to-br from-blue-100 via-slate-200 to-blue-200',             indicator: '🧊', text: 'text-blue-800' },
  magnet:    { bg: 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-red-500',          indicator: '🌀', text: 'text-white' },
  mirror:    { bg: 'bg-gradient-to-br from-gray-200 via-white to-gray-300',                 indicator: '🪞', text: 'text-gray-700' },
  silver:    { bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',                               text: 'text-white' },
  diamond:   { bg: 'bg-gradient-to-br from-cyan-300 via-sky-400 to-cyan-500',               indicator: '💠', text: 'text-white' },
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

const ANIMATED_PHASES = new Set<TilePhase>(['anticipation', 'clearing', 'falling', 'appearing', 'landing']);

function getPhaseStyles(phase: TilePhase, type: BlastTileType, fallOffset?: number, clearRotate?: number, spawnOffset?: number): React.CSSProperties {
  const clearing = CLEARING_COLORS[type];
  switch (phase) {
    case 'anticipation':
      return { filter: 'brightness(1.4)', transform: 'scale(1.1)', transition: 'all 120ms ease-out' };
    case 'clearing':
      return {
        transform: `scale(1.3) rotate(${clearRotate ?? 0}deg)`,
        opacity: 0,
        transition: 'all 180ms ease-in',
        ...(clearing && { background: clearing.background, border: clearing.border }),
      };
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
        transform: 'scaleY(1.1) scaleX(0.92)',
        transition: 'transform 80ms ease-out',
        animationFillMode: 'forwards',
      };
    default:
      return {};
  }
}

function getPhaseClasses(phase: TilePhase, isSelected: boolean): string {
  if (phase === 'selected' || (phase === 'idle' && isSelected)) {
    return 'scale-105 ring-2 ring-neo-lime ring-offset-1 ring-offset-neo-navy shadow-[0_0_12px_rgba(191,255,0,0.6)]';
  }
  return '';
}

export const BlastTile = memo(function BlastTile({
  letter, type, phase, isSelected, isCleared, hitsRemaining,
  fallOffset, clearRotate, spawnOffset, onClick,
}: BlastTileProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (isCleared) {
    return <div className="aspect-square opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;
  const effectivePhase = reducedMotion && ANIMATED_PHASES.has(phase) ? 'idle' : phase;
  const phaseStyle = effectivePhase !== 'idle' && effectivePhase !== 'selected'
    ? getPhaseStyles(effectivePhase, type, fallOffset, clearRotate, spawnOffset)
    : {};
  const needsWillChange = ANIMATED_PHASES.has(effectivePhase);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative aspect-square flex items-center justify-center',
        'border-neo rounded-lg shadow-hard-sm',
        'font-neo-display text-[clamp(1rem,4cqw,1.75rem)] font-bold uppercase',
        'transition-transform duration-150 select-none',
        visual.bg,
        visual.text ?? 'text-neo-navy',
        getPhaseClasses(effectivePhase, isSelected),
      ].filter(Boolean).join(' ')}
      style={{
        ...phaseStyle,
        ...(needsWillChange && { willChange: 'transform, opacity' }),
      }}
      aria-label={`${letter}${type !== 'standard' ? ` ${type} tile` : ''}`}
    >
      <span className="relative z-10">{letter}</span>
      {visual.indicator && (
        <span className="absolute top-0.5 end-0.5 text-[0.55rem] leading-none pointer-events-none" aria-hidden="true">
          {visual.indicator}
        </span>
      )}
      {hitsRemaining != null && hitsRemaining > 0 && (
        <span
          className="absolute bottom-0.5 start-0.5 text-[0.5rem] font-neo-body font-semibold bg-white/60 rounded px-0.5 leading-tight"
          aria-label={`${hitsRemaining} hits remaining`}
        >
          {hitsRemaining}
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
  prev.onClick === next.onClick
);

export default BlastTile;
