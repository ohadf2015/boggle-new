'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useStreakView } from '@/hooks/useStreakView';
import { claimOnce } from '@/lib/daily/streakToastOnce';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { shouldCelebrateStreakMilestone } from '@/utils/dailyChallenge/streaks';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { markMilestoneCheered, milestoneRunKey } from './milestoneCheer';
import { STREAK_MILESTONES, type StreakMilestone } from '@/lib/daily/streakRewards';

const StreakMilestoneReveal = dynamic(() => import('./StreakMilestoneReveal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/** Second look after the results land: the score row may not be saved on the first read. */
export const MILESTONE_RECHECK_MS = 1800;

interface StreakMilestonePopupProps {
  source: string;
  /** Another popup (the day prize) or the results reveal still holds the screen. */
  blocked: boolean;
}

interface OpenMilestone {
  milestone: StreakMilestone;
  mode: 'claim' | 'cheer';
}

/**
 * The one milestone moment on a results screen, once per milestone on this device:
 * a coin claim when the account has one waiting, otherwise a cheer on the rare days (30/100/365), guests included.
 */
export function StreakMilestonePopup({ source, blocked }: StreakMilestonePopupProps) {
  // The coin counter reads profile.total_coins.
  const { user, refreshProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const view = useStreakView();
  const [open, setOpen] = useState<OpenMilestone | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  // Armed after the second look, which also leaves the day prize (popped at ~0.7s) its turn first.
  const [armed, setArmed] = useState(false);
  // One modal per results screen: a claim that closes must not hand over to a cheer.
  const shown = useRef(false);
  const userId = user?.id ?? null;
  const { refresh } = view;

  useEffect(() => {
    setArmed(false);
    if (userId) refresh(true);
    const timer = setTimeout(() => {
      if (userId) refresh(true);
      setArmed(true);
    }, MILESTONE_RECHECK_MS);
    return () => clearTimeout(timer);
  }, [userId, refresh]);

  const { loading, isGuest, current, playedToday } = view;
  const claimable = loading ? null : view.milestone?.claimable ?? null;
  const days = claimable?.days;
  const coins = claimable?.coins;
  useEffect(() => {
    if (!armed || blocked || open || shown.current || loading) return;
    const today = getDailyChallengeDate();
    // Marked at show time: a reload must not pop it again; the hub card still offers the claim.
    if (userId && days && coins && claimOnce(`lc:streak-milestone-shown:${userId}:${days}`)) {
      shown.current = true;
      markMilestoneCheered(days, current, playedToday, today);
      setOpen({ milestone: { days, coins }, mode: 'claim' });
      return;
    }
    // Auth still settling: a guest number must never cheer at a signed-in player.
    if (!userId && !isGuest) return;
    if (!playedToday || !shouldCelebrateStreakMilestone(current)) return;
    const key = milestoneRunKey(current, current, playedToday, today);
    if (key && claimOnce(key)) {
      shown.current = true;
      const reward = STREAK_MILESTONES.find((m) => m.days === current)?.coins ?? 0;
      setOpen({ milestone: { days: current, coins: reward }, mode: 'cheer' });
    }
  }, [armed, blocked, open, loading, userId, isGuest, days, coins, current, playedToday]);

  const offerSignup = open?.mode === 'cheer' && !userId && !isOnCrazyGamesPlatform;

  return (
    <>
      {open && (
        <StreakMilestoneReveal
          milestone={open.milestone}
          mode={open.mode}
          source={source}
          onClaimed={() => {
            refresh(true);
            void refreshProfile?.();
          }}
          onClose={() => setOpen(null)}
          onSignup={offerSignup ? () => {
            trackGrowthEvent('save_streak_clicked', { source, days: open.milestone.days });
            setOpen(null);
            setSignupOpen(true);
          } : undefined}
        />
      )}
      {signupOpen && <AuthModal isOpen onClose={() => setSignupOpen(false)} initialMode="signup" />}
    </>
  );
}

export default StreakMilestonePopup;
