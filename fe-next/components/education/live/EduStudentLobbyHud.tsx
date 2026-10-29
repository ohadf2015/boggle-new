'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { getXpProgress } from '@/backend/modules/xpManager';
import StreakBonusIndicator from '@/components/education/StreakBonusIndicator';
import { DailyChest } from '@/components/student/academy/DailyChest';
import { canOpenChest } from '@/components/student/academy/dailyChestStore';
import type { EduT } from '@/components/education/lobby/eduText';

/** Signed-in students only: a guest has no level, and auth resolving late must never flip a shown HUD away. */
export function EduStudentLobbyHud({ t }: { t: EduT }) {
  const { loading, isAuthenticated, user, profile } = useAuth();
  if (loading || !isAuthenticated || !user || user.is_anonymous) return null;
  const xp = Number((profile as { total_xp?: number | null } | null)?.total_xp) || 0;
  return <SignedInHud userId={user.id} profileXp={xp} t={t} />;
}

function SignedInHud({ userId, profileXp, t }: { userId: string; profileXp: number; t: EduT }) {
  const { currentStreak } = useWinStreak();
  const reduceMotion = useShouldReduceMotion();
  const [grantedXp, setGrantedXp] = useState<number | null>(null);
  const [chestOffered] = useState(() => canOpenChest(userId, new Date()));
  const level = getXpProgress(Math.max(profileXp, grantedXp ?? 0)).currentLevel;

  return (
    <div data-testid="edu-student-hud" className="flex flex-wrap items-center gap-2">
      <span
        data-testid="edu-student-hud-level"
        className="inline-flex min-h-9 items-center rounded-full border-[3px] border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm"
      >
        {t('academy.student.level', { level })}
      </span>
      {currentStreak > 0 && <StreakBonusIndicator currentStreak={currentStreak} showBonus={false} variant="badge" size="sm" />}
      {chestOffered && (
        <DailyChest userId={userId} reducedMotion={reduceMotion} onGranted={(next) => next != null && setGrantedXp(next)} />
      )}
    </div>
  );
}
