'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useUnlockNotifier } from '@/hooks/useUnlockNotifier';

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
  // Only run once a real profile is loaded. Seeding the snapshot from a guest's
  // default Bronze/0 would spam a burst of "unlocked" toasts the moment a
  // returning ranked player signs in.
  if (!profile) return null;
  return <ActiveNotifier rankTier={profile.rank_tier || 'Bronze'} streakDays={profile.streak_days || 0} />;
}

export default UnlockNotifierMount;
