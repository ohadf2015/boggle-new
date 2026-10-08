'use client';

import { useGameMode } from '@/hooks/gameState';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';
import { ModeCoach } from './ModeCoach';

export function MpModeCoach() {
  const mode = mpCoachMode(useGameMode() ?? undefined);
  return mode ? <ModeCoach mode={mode} /> : null;
}
