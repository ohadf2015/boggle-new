'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { FREE_CLASSROOM_BOSS_ID, type ClassroomBossView } from '@/shared/types/classroomBoss';
import type { VocabQuizBoss } from '@/shared/types/vocabQuiz';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

export function quizBossView(boss: VocabQuizBoss): ClassroomBossView {
  const dealt = boss.maxHp > 0 ? (boss.maxHp - boss.hp) / boss.maxHp : 0;
  return {
    bossId: FREE_CLASSROOM_BOSS_ID,
    hp: boss.hp,
    maxHp: boss.maxHp,
    phase: 3,
    status: boss.defeated ? 'defeated' : 'escaped',
    telegraph: null,
    nextAttackMs: null,
    shield: 0,
    shieldMax: 0,
    combo: { count: 0, multiplier: 1, msLeft: 0 },
    lastHits: [],
    topHitters: [],
    effect: null,
    staggers: 0,
    pctDealt: Math.round(dealt * 100),
  };
}

/**
 * A quiz Boss Battle's verdict, fed to the same store the board boss uses, so
 * the shared projector recap and results card tell it with `BossOutcomeCard`.
 */
export function useQuizBossVerdict(socket: Socket | null | undefined): void {
  useEffect(() => {
    if (!socket) return undefined;
    let seeded: ClassroomBossView | null = null;
    const onResults = (payload: { vocabQuizBoss?: VocabQuizBoss } | null | undefined) => {
      if (!payload?.vocabQuizBoss) return;
      seeded = quizBossView(payload.vocabQuizBoss);
      useClassroomBossStore.getState().receiveState(seeded);
    };
    const onStart = () => {
      const store = useClassroomBossStore.getState();
      if (seeded && store.view === seeded) store.receiveState(null);
      seeded = null;
    };
    socket.on('validatedScores', onResults);
    socket.on('validationComplete', onResults);
    socket.on('startGame', onStart);
    return () => {
      socket.off('validatedScores', onResults);
      socket.off('validationComplete', onResults);
      socket.off('startGame', onStart);
    };
  }, [socket]);
}
