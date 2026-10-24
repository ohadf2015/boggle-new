'use client';

import { useEffect, useRef, useState } from 'react';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_CLASSROOM_BOSS_ID, type ClassroomBossId } from '@/shared/types/classroomBoss';
import { nextBossId } from './nextBossId';

const LAST_BOSS_KEY = 'lc_last_classroom_boss';

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_BOSS_KEY);
  } catch {
    return null;
  }
}

/** Boss choice state: Pro teachers start each visit on a new boss; free stays on the dragon the server enforces. */
export function useRotatingBoss() {
  const { hasPro, loading } = useTeacherPro();
  const [bossId, setBossId] = useState<ClassroomBossId>(FREE_CLASSROOM_BOSS_ID);
  const rotated = useRef(false);

  // Waits for the entitlement so a free teacher is never rotated onto a boss the server would refuse.
  useEffect(() => {
    if (loading || !hasPro || rotated.current) return;
    rotated.current = true;
    const next = nextBossId(readLast());
    setBossId(next);
    try {
      localStorage.setItem(LAST_BOSS_KEY, next);
    } catch {
      /* private mode: rotation just restarts next visit */
    }
  }, [loading, hasPro]);

  return [bossId, setBossId] as const;
}
