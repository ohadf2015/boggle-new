'use client';

import { useGameMode } from '@/hooks/gameState';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';
import { ModeCoach } from './ModeCoach';
import { useBossActive } from '@/stores/classroomBossStore';

export function MpModeCoach() {
  const mode = mpCoachMode(useGameMode() ?? undefined);
  // A boss round teaches itself in the 3-2-1; the classic coach mark would cover the board mid-fight.
  const bossRound = useBossActive();
  return mode && !bossRound ? <ModeCoach mode={mode} /> : null;
}
