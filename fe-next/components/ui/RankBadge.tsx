import { cn } from '@/lib/utils';

/** Rank badge color classes for top 3 places (1-indexed). */
const RANK_BADGE_COLORS = [
  'bg-tier-gold text-neo-black border-tier-gold-border',   // 1st - gold
  'bg-neo-cream/30 text-neo-black border-neo-gray',       // 2nd - silver
  'bg-tier-bronze text-neo-black border-tier-bronze-border', // 3rd - bronze
] as const;

export { RANK_BADGE_COLORS };

/**
 * RankBadge - Neo-brutalist rank circle for leaderboards.
 *
 * Shared between MobileCompactLeaderboard and ResultsInfoCards.
 * Shows a colored circle badge for ranks 1-3, plain number for 4+.
 */
export function RankBadge({ rank }: { rank: number }) {
  if (rank >= 1 && rank <= 3) {
    return (
      <span className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border-2',
        RANK_BADGE_COLORS[rank - 1],
      )}>
        {rank}
      </span>
    );
  }
  return <span className="text-sm w-5 text-center text-black/50 font-bold">{rank}.</span>;
}
