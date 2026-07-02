'use client';

import { cn } from '@/lib/utils';
import { TOPPLE_AFTER_SLOPPY, type PlacementOutcome } from '@/lib/wordTower/cranePlacement';
import type { ReleaseFx } from '@/lib/wordTower/craneReleaseFx';

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
  // Dots — 0, 1, 2, 3 (3 = next miss topples a floor).
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

/** Sparkle burst scattered around the landed girder when the drop scored well.
 *  Pure CSS; count + reach scale with how clean it was. */
export function CraneSparkBurst({ release }: { release: ReleaseFx }) {
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
              // @ts-expect-error custom props consumed by the keyframe
              '--sx': `${Math.cos(ang) * dist}px`,
              '--sy': `${Math.sin(ang) * dist}px`,
              animationDelay: `${(i % 4) * 20}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The crane's own footer (verdict pill / TAP-TO-DROP button) — only rendered
 *  when the parent does NOT drive the drop via the imperative ref. */
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
