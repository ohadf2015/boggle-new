'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { RIVAL_EVENTS, type RivalUpdatePayload, type RivalView } from '@/shared/types/rivalry';

export const RIVAL_PULSE_MS = 900;

export type RivalStatus = 'ahead' | 'behind' | 'level';

export interface RivalOutcome {
  rivalName: string;
  diff: number;
  won: boolean;
}

export interface RivalAnnouncement {
  key: 'education.rivals.announce.lead' | 'education.rivals.announce.passed';
  name: string;
}

type RivalSocket = Pick<Socket, 'on' | 'off' | 'emit'>;

const statusOf = (diff: number): RivalStatus => (diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'level');

export function rivalOutcomeOf(view: RivalView | null): RivalOutcome | null {
  if (!view) return null;
  const diff = view.myScore - view.rivalScore;
  return { rivalName: view.rivalName, diff, won: diff > 0 };
}

export function useRival(socket: RivalSocket | null | undefined) {
  const [rival, setRival] = useState<RivalView | null>(null);
  const [pulse, setPulse] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [announcement, setAnnouncement] = useState<RivalAnnouncement | null>(null);
  const session = useRef<number | null>(null);
  const lastStatus = useRef<RivalStatus | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const current = (id: number | null | undefined) => {
      if (typeof id !== 'number') return true;
      if (session.current !== null && id < session.current) return false;
      session.current = id;
      return true;
    };

    const show = (next: RivalView | null, tookLead = false) => {
      setRival(next);
      if (!next) {
        lastStatus.current = null;
        return;
      }
      const status = statusOf(next.myScore - next.rivalScore);
      const before = lastStatus.current;
      lastStatus.current = status;
      if (tookLead || (before && before !== 'ahead' && status === 'ahead')) {
        setAnnouncement({ key: 'education.rivals.announce.lead', name: next.rivalName });
      } else if (before === 'ahead' && status === 'behind') {
        setAnnouncement({ key: 'education.rivals.announce.passed', name: next.rivalName });
      }
      if (tookLead) {
        setPulse((n) => n + 1);
        setPulsing(true);
        if (pulseTimer.current) clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => setPulsing(false), RIVAL_PULSE_MS);
      }
    };

    const onUpdate = (data: RivalUpdatePayload) => {
      if (!data || !current(data.gameSessionId)) return;
      show(data.rival ?? null, !!data.tookLead);
    };

    const onStart = (data: { gameSessionId?: number; rival?: RivalView | null } | undefined) => {
      if (!data) return;
      const previous = session.current;
      if (!current(data.gameSessionId)) return;
      if ('rival' in data) show(data.rival ?? null);
      else if (data.gameSessionId !== previous) show(null);
    };

    socket.on(RIVAL_EVENTS.update, onUpdate);
    socket.on('startGame', onStart);
    socket.emit(RIVAL_EVENTS.sync);
    return () => {
      socket.off(RIVAL_EVENTS.update, onUpdate);
      socket.off('startGame', onStart);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, [socket]);

  const diff = rival ? rival.myScore - rival.rivalScore : 0;
  return {
    rival,
    diff,
    status: statusOf(diff),
    pulse,
    pulsing,
    announcement,
    rivalOutcome: rivalOutcomeOf(rival),
  };
}
