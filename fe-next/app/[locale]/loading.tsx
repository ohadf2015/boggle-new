import { cn } from '@/lib/utils';
import { LandingCubesSkeleton } from '@/components/landing/LandingCubesSkeleton';

/**
 * Landing page loading skeleton — neo-brutalist style with shimmer.
 * Server Component: streams as HTML with zero JS, painted before hydration.
 * Uses Tailwind animate-pulse instead of injected <style> for faster first paint.
 */
export default function Loading() {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe h-full">
      {/* Header skeleton */}
      <header className="w-full h-14 sm:h-16 bg-neo-navy-light border-b-3 border-neo-black flex items-center px-3 sm:px-4 gap-3">
        <div className="w-8 h-8 rounded-neo bg-neo-white/10 animate-pulse" />
        <div className="h-5 w-24 sm:w-32 rounded bg-neo-white/10 animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-neo-white/10 animate-pulse" />
      </header>

      {/* Main content */}
      <main className="w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex-1 flex flex-col px-2 sm:px-3 lg:px-6 xl:px-8 py-3 sm:py-5 lg:py-8 gap-6 sm:gap-8">

        {/* Season strip — LandingSeasonHero sits ABOVE the hero in LandingView (:207).
            Reserving its slim height here keeps the real page from shifting down on swap. */}
        <div
          data-testid="loading-season-strip"
          className="w-full max-w-4xl mx-auto rounded-neo border-3 border-neo-black bg-neo-purple/20 shadow-hard flex items-center gap-3 px-4 sm:px-5 py-2 sm:py-2.5 animate-pulse"
          style={{ minHeight: '52px' }}
        >
          <div className="w-8 h-8 rounded-neo bg-neo-white/10 shrink-0" />
          <div className="h-4 w-40 sm:w-56 rounded bg-neo-white/10" />
          <div className="flex-1" />
          <div className="hidden sm:block h-8 w-24 rounded-neo bg-neo-white/10" />
        </div>

        {/* Hero section */}
        <div className="w-full max-w-5xl mx-auto px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 lg:gap-10">
            {/* Left: Mascot + title + CTA */}
            <div className="flex flex-col items-center sm:items-start flex-1 w-full">
              {/* Mobile: inline mascot + title */}
              <div className="flex items-center gap-3 mb-2 sm:flex-col sm:items-start sm:gap-0">
                {/* Mascot */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-neo-navy-light border-3 border-neo-black animate-pulse shrink-0" />
                {/* Title */}
                <div className="sm:mt-3 sm:mb-2">
                  <div className="h-6 sm:h-8 lg:h-10 w-40 sm:w-56 lg:w-72 rounded-neo bg-neo-white/10 animate-pulse" />
                </div>
              </div>
              {/* Subtitle */}
              <div className="h-4 sm:h-5 w-48 sm:w-64 rounded bg-neo-white/8 animate-pulse mb-3 sm:mb-5" />
              {/* CTA button */}
              <div className="w-full sm:w-auto">
                <div className={cn(
                  'h-11 sm:h-14 w-full sm:w-48 rounded-neo',
                  'bg-neo-lime/30 border-3 border-neo-black/30 shadow-hard animate-pulse'
                )} />
              </div>
            </div>

            {/* Right: Leaderboard preview (tablet+) */}
            <div className="hidden md:block w-64 lg:w-80 xl:w-96 shrink-0">
              <LeaderboardSkeleton rows={5} />
            </div>
          </div>

          {/* Mobile leaderboard (compact) */}
          <div className="sm:hidden mt-4">
            <LeaderboardSkeletonCompact />
          </div>
        </div>

        {/* Social proof bar */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={`proof-${i}`} className="h-7 sm:h-8 w-20 sm:w-28 rounded-full bg-neo-white/8 border border-neo-white/10 animate-pulse" />
          ))}
        </div>

        {/* Mode cubes — mirrors the live LandingModeCubes bento (daily hero strip +
            2×2 anchor + small cubes) so the skeleton→content swap reflows nothing. */}
        <LandingCubesSkeleton />
      </main>
    </div>
  );
}

/** Leaderboard skeleton — matches LandingLeaderboardPreview shape */
function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard-lg rounded-neo-lg p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-neo-yellow/30 animate-pulse" />
        <div className="h-5 w-28 bg-neo-white/10 rounded animate-pulse" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`lb-row-${i}`} className={cn(
            'flex items-center gap-3 py-1.5 px-2 rounded-neo',
            i < 3 && 'bg-neo-white/5'
          )}>
            <div className={cn(
              'w-7 h-7 rounded-full border-2 border-neo-black/20 shrink-0 animate-pulse',
              i === 0 ? 'bg-yellow-400/30' : i === 1 ? 'bg-gray-300/30' : i === 2 ? 'bg-amber-600/30' : 'bg-neo-white/10'
            )} />
            <div className="w-8 h-8 rounded-full bg-neo-white/10 shrink-0 animate-pulse" />
            <div className="flex-1 h-4 bg-neo-white/8 rounded animate-pulse" style={{ maxWidth: `${70 - i * 8}%` }} />
            <div className="h-4 w-12 bg-neo-lime/15 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-neo-white/10">
        <div className="h-3.5 w-28 bg-neo-white/8 rounded animate-pulse" />
      </div>
    </div>
  );
}

/** Compact leaderboard skeleton — top 3 horizontal (mobile) */
function LeaderboardSkeletonCompact() {
  return (
    <div className="bg-neo-navy-light border-2 border-neo-black shadow-hard rounded-neo p-3">
      <div className="flex items-center justify-center gap-1 mb-2">
        <div className="w-4 h-4 rounded bg-neo-yellow/30 animate-pulse" />
        <div className="h-3.5 w-24 bg-neo-white/10 rounded animate-pulse" />
      </div>
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div key={`top3-${i}`} className="flex flex-col items-center gap-1 min-w-0">
            <div className={cn(
              'w-6 h-6 rounded-full border-2 border-neo-black/20 animate-pulse',
              i === 0 ? 'bg-yellow-400/30' : i === 1 ? 'bg-gray-300/30' : 'bg-amber-600/30'
            )} />
            <div className="w-10 h-10 rounded-full bg-neo-white/10 animate-pulse" />
            <div className="h-3 w-12 bg-neo-white/8 rounded animate-pulse" />
            <div className="h-3 w-8 bg-neo-lime/15 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

