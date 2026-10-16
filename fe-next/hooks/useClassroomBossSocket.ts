'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import {
  CLASSROOM_BOSS_EVENTS,
  type ClassroomBossAttackEvent,
  type ClassroomBossPlayerHit,
  type ClassroomBossView,
} from '@/shared/types/classroomBoss';
import { useBossActive, useClassroomBossStore } from '@/stores/classroomBossStore';

const HIT_EVENTS = ['wordAccepted', 'wordAlreadyFoundByOther', 'wordValidatedByVotes'] as const;

/** Feeds the boss store from the room (null socket outside a classroom). The store is scoped to the room code, not the mount. */
export function useClassroomBossSocket(socket: Socket | null | undefined, gameCode: string | null | undefined): boolean {
  useEffect(() => {
    useClassroomBossStore.getState().attachRoom(gameCode ?? null);
  }, [gameCode]);

  useEffect(() => {
    if (!socket) return undefined;
    const store = useClassroomBossStore.getState();
    const onState = (view: ClassroomBossView | null) => store.receiveState(view ?? null);
    const onAttack = (attack: ClassroomBossAttackEvent) => store.receiveAttack(attack);
    const onHit = (payload: { word?: string; boss?: ClassroomBossPlayerHit }) => {
      if (payload?.boss && payload.word) store.receiveMyHit(payload.word, payload.boss);
    };
    socket.on(CLASSROOM_BOSS_EVENTS.state, onState);
    socket.on(CLASSROOM_BOSS_EVENTS.attack, onAttack);
    for (const e of HIT_EVENTS) socket.on(e, onHit);
    return () => {
      socket.off(CLASSROOM_BOSS_EVENTS.state, onState);
      socket.off(CLASSROOM_BOSS_EVENTS.attack, onAttack);
      for (const e of HIT_EVENTS) socket.off(e, onHit);
    };
  }, [socket]);
  return useBossActive();
}
