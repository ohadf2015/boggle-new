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

/** Lays out as grid cells of the lobby's identity row: badges under the name, the chest in its own column. Guests too: an anonymous account keeps its own XP and chest; with no account at all the HUD shows the starting level. */
export function EduStudentLobbyHud({ t }: { t: EduT }) {
  const { loading, isAuthenticated, user, profile } = useAuth();
  if (loading) return null;
  const xp = Number((profile as { total_xp?: number | null } | null)?.total_xp) || 0;
  const userId = isAuthenticated && user ? user.id : null;
  return <StudentHud key={userId ?? 'none'} userId={userId} profileXp={xp} t={t} />;
}

function StudentHud({ userId, profileXp, t }: { userId: string | null; profileXp: number; t: EduT }) {
  const { currentStreak } = useWinStreak();
  const reduceMotion = useShouldReduceMotion();
  const [grantedXp, setGrantedXp] = useState<number | null>(null);
  const [chestOffered] = useState(() => userId !== null && canOpenChest(userId, new Date()));
  const level = getXpProgress(Math.max(profileXp, grantedXp ?? 0)).currentLevel;

  return (
    <>
      <div data-testid="edu-student-hud" className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-2">
        <span
          data-testid="edu-student-hud-level"
          className="inline-flex min-h-9 items-center rounded-full border-[3px] border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm"
        >
          {t('academy.student.level', { level })}
        </span>
        {currentStreak > 0 && <StreakBonusIndicator currentStreak={currentStreak} showBonus={false} variant="badge" size="sm" />}
      </div>
      {chestOffered && userId && (
        <div data-testid="edu-student-chest-slot" className="col-start-3 row-span-2 row-start-1 self-center">
          <DailyChest userId={userId} reducedMotion={reduceMotion} onGranted={(next) => next != null && setGrantedXp(next)} />
        </div>
      )}
    </>
  );
}
