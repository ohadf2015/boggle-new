'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useUnlockNotifier } from '@/hooks/useUnlockNotifier';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { getGlobalLeaderboardTier } from '@/lib/ranked/leaderboardTiers';

/**
 * Global mount for the cosmetic unlock notifier.
 *
 * Lives in the always-rendered app shell (not the profile page) so the
 * "✨ New cosmetic unlocked — tap to equip" toast fires WHEREVER the player is
 * when they rank up or hit a streak milestone (typically right after an MP win),
 * deep-linking them to the collection. Mounting it only on profile made the
 * toast a no-op — it could only appear one tap from the collection it links to.
 *
 * Renders nothing.
 */
function ActiveNotifier({ rankTier }: { rankTier: string }) {
  // Streak lives in player_engagement, not on the profile row.
  const { streak } = useEngagementStatus();
  useUnlockNotifier({ rankTier, streakDays: streak });
  return null;
}

export function UnlockNotifierMount() {
  const { profile } = useAuth();
  // Only run once a real profile is loaded. Seeding the snapshot from a guest's
  // default Stone/0 would spam a burst of "unlocked" toasts the moment a
  // returning ranked player signs in. Tier is derived from total_score (the
  // score-based leaderboard tier) — the same axis the cosmetics gate uses.
  if (!profile) return null;
  return <ActiveNotifier rankTier={getGlobalLeaderboardTier(profile.total_score ?? 0).id} />;
}

export default UnlockNotifierMount;
