'use client';

import { useEffect, useState } from 'react';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';
import type { ClassroomRecordStatus } from '@/lib/education/classroomRoomGone';

export interface ClassroomLiveGame {
  info: LiveClassroomGameInfo | null;
  status: ClassroomRecordStatus;
}

// Backoff between attempts on a 429. The endpoint's 60/min/IP bucket is the
// brute-force guard for an unauthenticated code-lookup route, so it stays
// untouched; a burst 429 (a class behind one school NAT) is transient, and a
// 429 must never read as "not a classroom room".
const RETRY_DELAYS_MS = [1000, 3000];

/**
 * "What is this classroom room playing, and whose class is it?" — with the
 * fetch lifecycle exposed, because classroom DETECTION depends on it: a
 * student who typed a classroom code into the arcade lobby has no
 * `?classroom=true`, so this record (404 for arcade rooms) is the only signal
 * that their exits must stay in education. `status` is tri-state so consumers
 * can defer decisions while the answer is unknown instead of guessing arcade.
 *
 * The teacher's browser answers from its own `sessionStorage`
 * (`lessonGameData`). Every other client in the room — every student, and every
 * guest who scanned the QR — has no copy, so their classroom lobby rendered
 * defaults: mode "Classic", classic settings, and the generic "Classroom
 * Session" heading. Recurring pitfall class 1, with one of the two sources
 * simply absent.
 *
 * One fetch per room code (plus bounded 429 retries). The record is written
 * once when the teacher creates the game and does not change while the lobby
 * is open, so there is nothing to poll for.
 */
export function useClassroomLiveGame(
  gameCode: string | undefined,
  enabled: boolean
): ClassroomLiveGame {
  const [state, setState] = useState<ClassroomLiveGame>({ info: null, status: 'idle' });

  useEffect(() => {
    if (!enabled || !gameCode || gameCode.length !== 6) {
      setState({ info: null, status: 'idle' });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setState({ info: null, status: 'loading' });

    const attempt = async (retriesLeft: number) => {
      try {
        const res = await fetch(
          `/api/education/classroom/live-game?code=${encodeURIComponent(gameCode)}`,
          { signal: controller.signal }
        );
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as LiveClassroomGameInfo;
          if (!cancelled) setState({ info: data, status: 'found' });
          return;
        }
        if (res.status === 404) {
          setState({ info: null, status: 'absent' });
          return;
        }
        if (res.status === 429 && retriesLeft > 0) {
          retryTimer = setTimeout(() => {
            void attempt(retriesLeft - 1);
          }, RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - retriesLeft]);
          return;
        }
        setState({ info: null, status: 'error' });
      } catch {
        // A room we cannot describe still plays. Labelling degrades, and
        // 'error' lets classroom detection degrade to its pre-record behavior
        // instead of hanging decisions on a fetch that will never answer.
        if (!cancelled) setState({ info: null, status: 'error' });
      }
    };
    void attempt(RETRY_DELAYS_MS.length);

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [gameCode, enabled]);

  return state;
}

/**
 * "What is this classroom room playing, and whose class is it?"
 *
 * The teacher's own browser knows all of this from `lessonGameData` in its
 * sessionStorage. Nobody else does — which is why a student's classroom lobby
 * rendered Classic defaults over a Vocab Quiz and a heading that said
 * "Classroom Session" rather than the class's name.
 */
export function useLiveClassroomGameInfo(
  gameCode: string | undefined,
  enabled: boolean
): LiveClassroomGameInfo | null {
  return useClassroomLiveGame(gameCode, enabled).info;
}

export default useLiveClassroomGameInfo;
