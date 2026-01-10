'use client';

import { NeoLoader } from '@/components/ui/NeoLoader';

/**
 * Leaderboard page loading state
 * Uses playful NeoLoader with letter tiles
 */
export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neo-navy via-neo-navy-light to-neo-navy">
      <NeoLoader variant="letters" size="lg" />
    </div>
  );
}
