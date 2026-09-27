'use client';

import { useEffect, useState } from 'react';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';

/**
 * "What is this classroom room playing, and whose class is it?"
 *
 * The teacher's browser answers that from its own `sessionStorage`
 * (`lessonGameData`). Every other client in the room — every student, and every
 * guest who scanned the QR — has no copy, so their classroom lobby rendered
 * defaults: mode "Classic", classic settings, and the generic "Classroom
 * Session" heading. Recurring pitfall class 1, with one of the two sources
 * simply absent.
 *
 * One fetch per room code. The record is written once when the teacher creates
 * the game and does not change while the lobby is open, so there is nothing to
 * poll for; a room that has not been created yet (the teacher's own first
 * moments) answers 404 and the caller keeps its local copy.
 */
export function useLiveClassroomGameInfo(
  gameCode: string | undefined,
  enabled: boolean
): LiveClassroomGameInfo | null {
  const [info, setInfo] = useState<LiveClassroomGameInfo | null>(null);

  useEffect(() => {
    if (!enabled || !gameCode || gameCode.length !== 6) {
      setInfo(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/education/classroom/live-game?code=${encodeURIComponent(gameCode)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as LiveClassroomGameInfo;
        if (!cancelled) setInfo(data);
      } catch {
        // A room we cannot describe still plays. Every consumer falls back to
        // its local copy or a generic label, so a failure here costs labelling,
        // never the game.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gameCode, enabled]);

  return info;
}

export default useLiveClassroomGameInfo;
