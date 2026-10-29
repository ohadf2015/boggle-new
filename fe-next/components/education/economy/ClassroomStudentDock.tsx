'use client';

import { useEffect, useState } from 'react';
import { isClassroomStudentPlay } from '@/lib/education/classroomPlaySurface';
import { useGameMode } from '@/hooks/gameState/selectors';
import { useBossActive } from '@/stores/classroomBossStore';
import { useLiveWordHaptics } from '@/hooks/useLiveWordHaptics';
import ClassroomEconomyDock from './ClassroomEconomyDock';

/** Classic and blast boards and the boss strip already buzz on an accept; only these modes need one here. */
const DOCK_BUZZ_MODES = new Set(['word-hunt']);

/**
 * The class economy strip for a student in a classroom round, any board mode.
 * Resolved after mount (URL), so the first render matches the server.
 */
export default function ClassroomStudentDock({ gameCode }: { gameCode: string | null | undefined }) {
  const [student, setStudent] = useState(false);
  const gameMode = useGameMode();
  const bossActive = useBossActive();
  useEffect(() => {
    setStudent(isClassroomStudentPlay(new URLSearchParams(window.location.search)));
  }, []);
  useLiveWordHaptics(student && !bossActive && DOCK_BUZZ_MODES.has(gameMode ?? ''));
  return student && gameCode ? <ClassroomEconomyDock gameCode={gameCode} /> : null;
}
