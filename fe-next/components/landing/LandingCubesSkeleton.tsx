import React from 'react';
import { cn } from '@/lib/utils';

/**
 * LandingCubesSkeleton — loading placeholder for the `cubes` landing variant.
 *
 * Mirrors `LandingModeCubes` ONE-TO-ONE (same wrapper width, same daily-hero
 * strip, same `grid-cols-2 md:grid-cols-4` bento with a 2×2 anchor + small
 * square cubes) so the skeleton→content swap reflows nothing. The old
 * `LandingCardsSkeleton` drew the control card column (max-w-4xl, stacked
 * cards) — showing it on a cubes load caused a visible layout jump.
 *
 * Decorative only (`aria-hidden`); the real labels arrive with the content.
 */
export const LandingCubesSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  // anchor + 6 small cubes = the public mode set the bento renders.
  const cubes = Array.from({ length: 6 });
  return (
    <div
      data-testid="landing-cubes-skeleton"
      aria-hidden="true"
      className={cn('mx-auto w-full max-w-5xl space-y-5 md:space-y-6 xl:max-w-6xl', className)}
    >
      {/* Daily-hero strip — matches the wide DailyChallengeCube tile */}
      <div
        data-testid="cubes-skeleton-daily"
        className="h-[64px] w-full rounded-neo border-2 border-white/10 bg-neo-navy-light sm:h-[76px] motion-safe:animate-pulse"
      />

      <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* 2×2 anchor placeholder — same span + aspect ramp as the live anchor */}
        <div
          data-testid="cubes-skeleton-anchor"
          className="col-span-2 aspect-[16/9] rounded-neo border-2 border-white/10 bg-neo-navy-light sm:aspect-[2/1] md:row-span-2 md:aspect-square motion-safe:animate-pulse"
        />
        {cubes.map((_, i) => (
          <div
            key={i}
            data-testid="cubes-skeleton-cube"
            // stagger the pulse so the grid breathes instead of strobing in unison
            style={{ animationDelay: `${i * 0.12}s` }}
            className="aspect-square rounded-neo border-2 border-white/10 bg-neo-navy-light motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
};

export default LandingCubesSkeleton;
