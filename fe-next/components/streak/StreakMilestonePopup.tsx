'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakView } from '@/hooks/useStreakView';
import { claimOnce } from '@/lib/daily/streakToastOnce';
import type { StreakMilestone } from '@/lib/daily/streakRewards';

const StreakMilestoneReveal = dynamic(() => import('./StreakMilestoneReveal'), { ssr: false });

/** Second look after the results land: the score row may not be saved on the first read. */
export const MILESTONE_RECHECK_MS = 1800;

interface StreakMilestonePopupProps {
  source: string;
  /** Another popup (the day prize) or the results reveal still holds the screen. */
  blocked: boolean;
}

/** Opens the milestone claim on a results screen, once per milestone on this device. */
export function StreakMilestonePopup({ source, blocked }: StreakMilestonePopupProps) {
  // The coin counter reads profile.total_coins.
  const { user, refreshProfile } = useAuth();
  const view = useStreakView();
  const [open, setOpen] = useState<StreakMilestone | null>(null);
  // Armed after the second look, which also leaves the day prize (popped at ~0.7s) its turn first.
  const [armed, setArmed] = useState(false);
  const userId = user?.id ?? null;
  const { refresh } = view;

  useEffect(() => {
    if (!userId) return undefined;
    refresh(true);
    const timer = setTimeout(() => {
      refresh(true);
      setArmed(true);
    }, MILESTONE_RECHECK_MS);
    return () => clearTimeout(timer);
  }, [userId, refresh]);

  const claimable = view.loading ? null : view.milestone?.claimable ?? null;
  const days = claimable?.days;
  const coins = claimable?.coins;
  useEffect(() => {
    if (!armed || blocked || open || !userId || !days || !coins) return;
    // Marked at show time: a reload must not pop it again; the hub card still offers the claim.
    if (claimOnce(`lc:streak-milestone-shown:${userId}:${days}`)) setOpen({ days, coins });
  }, [armed, blocked, open, userId, days, coins]);

  if (!open) return null;
  return (
    <StreakMilestoneReveal
      milestone={open}
      source={source}
      onClaimed={() => {
        refresh(true);
        void refreshProfile?.();
      }}
      onClose={() => setOpen(null)}
    />
  );
}

export default StreakMilestonePopup;
