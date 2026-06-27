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
function ActiveNotifier({ rankTier, streakDays }: { rankTier: string; streakDays: number }) {
  useUnlockNotifier({ rankTier, streakDays });
  return null;
}

export function UnlockNotifierMount() {
  const { profile } = useAuth();
  const { streak, loading } = useEngagementStatus();
  // Wait for BOTH a real profile AND a resolved streak before mounting the
  // notifier. useEngagementStatus starts at streak=0 (loading) then resolves;
  // feeding the transient 0 in would snapshot 0 and then fire false "unlocked"
  // toasts for streak cosmetics the instant the real streak lands (Class 1:
  // dual-source + async resolution). Tier comes from total_score (on profile,
  // resolves with it) so only the streak axis needs the loading gate.
  if (!profile || loading) return null;
  return (
    <ActiveNotifier
      rankTier={getGlobalLeaderboardTier(profile.total_score ?? 0).id}
      streakDays={streak}
    />
  );
}

export default UnlockNotifierMount;
