'use client';

import { cn } from '@/lib/utils';
import { TOPPLE_AFTER_SLOPPY, PERFECT_MAX, GOOD_MAX, SLOPPY_MAX, type PlacementOutcome, type PlacementQuality } from '@/lib/wordTower/cranePlacement';

interface SparkBurstFx {
  sparkles: number;
  glow: boolean;
}

const QUALITY_STYLE: Record<string, string> = {
  perfect: 'bg-neo-lime text-neo-black',
  good: 'bg-neo-cyan text-neo-black',
  sloppy: 'bg-neo-yellow text-neo-black',
  miss: 'bg-neo-red text-neo-white',
};

/** Stability meter — instability you can SEE before the topple lands. */
export function CraneStabilityMeter({
  consecutiveSloppy,
  t,
}: {
  consecutiveSloppy: number;
  t: (key: string) => string;
}) {
  const dots = Array.from({ length: TOPPLE_AFTER_SLOPPY + 1 }, (_, i) => i < consecutiveSloppy);
  return (
    <div
      className="flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-navy/85 px-2 py-1 font-neo-body text-[10px] font-bold uppercase tracking-wider text-neo-white shadow-hard backdrop-blur-sm"
      aria-label={t('wordTower.crane.stability')}
    >
      <span className="text-[10px]">{t('wordTower.crane.stability')}</span>
      <div className="flex gap-1" aria-hidden>
        {dots.map((on, i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full border border-black',
              on
                ? i >= TOPPLE_AFTER_SLOPPY
                  ? 'bg-neo-red'
                  : i === TOPPLE_AFTER_SLOPPY - 1
                  ? 'bg-neo-orange'
                  : 'bg-neo-yellow'
                : 'bg-neo-navy-light',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Alignment bar — sweeps left-right showing the current placement quality.
 *  A glowing reticle sweeps across a track; the track is colour-coded by
 *  quality band (perfect/good/sloppy/miss). Tap to drop when the indicator
 *  is in the green (perfect) zone. Same on every drop so the player can
 *  learn the timing. */
export function CraneAlignmentBar({
  pos,
  sway,
  liveBand,
  perfectBandBonus = 0,
  onSweetSpot,
  reducedMotion,
  t,
}: {
  pos: number;
  sway: number;
  liveBand: PlacementQuality;
  perfectBandBonus?: number;
  onSweetSpot: boolean;
  reducedMotion?: boolean;
  t: (key: string) => string;
}) {
  // Normalised trolley position [-1, 1]
  const bandPos = ((pos - sway) + 1) / 2; // 0..1
  const pct = `${Math.round(bandPos * 100)}%`;

  // Quality band colour for the bar fill
  const bandColor =
    liveBand === 'perfect' ? 'bg-neo-lime' :
    liveBand === 'good' ? 'bg-neo-cyan' :
    liveBand === 'sloppy' ? 'bg-neo-yellow' :
    'bg-neo-red';

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="group"
      aria-label={t('wordTower.crane.alignment')}
    >
      {/* Track background — shows the quality zones */}
      <div className="relative h-2 w-48 overflow-hidden rounded-neo border border-black bg-neo-navy">
        {/* Perfect zone (center) */}
        <span className="absolute inset-y-0 rounded bg-neo-lime/25" style={{ left: `${(1 - PERFECT_MAX - perfectBandBonus) * 50}%`, right: `${(1 - PERFECT_MAX - perfectBandBonus) * 50}%` }} />
        {/* Good zone (inner) */}
        <span className="absolute inset-y-0 bg-neo-cyan/15" style={{ left: '12%', right: '12%' }} />
        {/* Sloppy zone (outer) */}
        <span className="absolute inset-y-0 bg-neo-yellow/10" style={{ left: '5%', right: '5%' }} />
        {/* Moving indicator */}
        <span
          className={cn(
            'absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm shadow-hard',
            bandColor,
            onSweetSpot && !reducedMotion && 'crane-target-hot',
          )}
          style={{
            left: pct,
            transition: reducedMotion ? 'none' : 'left 40ms linear',
            boxShadow: onSweetSpot ? '0 0 8px 2px rgba(191,255,0,0.8)' : '2px 2px 0 rgba(0,0,0,0.85)',
          }}
          aria-hidden
        />
      </div>
      {/* Quality label */}
      <span className="font-neo-display text-[9px] font-bold uppercase tracking-wider text-neo-white/70">
        {t(`wordTower.crane.${liveBand}`)}
      </span>
    </div>
  );
}

/** Sparkle burst scattered around the landed girder when the drop scored well. */
export function CraneSparkBurst({ release }: { release: SparkBurstFx }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {Array.from({ length: release.sparkles }).map((_, i) => {
        const ang = (i / release.sparkles) * Math.PI * 2;
        const dist = release.glow ? 30 : 18;
        return (
          <span
            key={i}
            className="crane-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-neo-lime"
            style={{
              '--sx': `${Math.cos(ang) * dist}px`,
              '--sy': `${Math.sin(ang) * dist}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** The crane's own footer (verdict pill / TAP-TO-DROP button). */
export function CraneFooter({
  result,
  falling,
  reducedMotion,
  onTap,
  t,
}: {
  result: PlacementOutcome | null;
  falling: boolean;
  reducedMotion: boolean;
  onTap: () => void;
  t: (key: string) => string;
}) {
  if (result) {
    return (
      <div
        role="status"
        aria-live="assertive"
        className={cn(
          'rounded-neo border-neo-thick border-black px-4 py-1 font-neo-display text-base font-black uppercase shadow-hard',
          QUALITY_STYLE[result.quality],
          !reducedMotion && 'animate-neo-pop',
        )}
      >
        {t(`wordTower.crane.${result.quality}`)}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-testid="crane-drop"
      onClick={onTap}
      disabled={falling}
      className={cn(
        'rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-2 font-neo-display text-base font-black uppercase text-neo-black shadow-hard transition-transform active:translate-y-px',
        !reducedMotion && !falling && 'animate-neo-pop',
        falling && 'opacity-40',
      )}
    >
      {t('wordTower.crane.tapToDrop')}
    </button>
  );
}
