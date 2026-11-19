'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearRehearseIntent, peekRehearseIntentForRoom, type RehearseIntent } from '@/lib/education/rehearsal';

export const PRACTICE_SEAT_TIMEOUT_MS = 12_000;
export const PRACTICE_SEAT_RETRY_EVENT = 'lexiclash:practice-seat-retry';
export const PRACTICE_SKIP_TO_GAME_EVENT = 'lexiclash:practice-skip-to-game';
/** The round cannot start by itself: the reason and the way forward are on the board. */
export const PRACTICE_NEEDS_BOARD_EVENT = 'lexiclash:practice-needs-board';

interface Args {
  /** This room: only a rehearsal launched into it (the launch's claim) auto-starts here. */
  gameCode: string;
  enabled: boolean;
  /** The server has the host in the room; before that, setAutoFill is refused as not-in-game. */
  hostSeated: boolean;
  /** The teacher's practice seat is in the room. */
  practiceSeated?: boolean;
  /** That seat pressed READY: a practice run starts here, so the teacher gets the student's pre-game practice first. */
  practiceReady?: boolean;
  /** False when the room's mode ignores bots: the lobby's switch-to-Classic offer takes over instead. */
  botsAllowed: boolean;
  start: (intent: RehearseIntent) => void;
}

export interface RehearseAutoStart {
  /** A practice run waited the full timeout and the teacher's student seat never joined. */
  seatTimedOut: boolean;
  startBotsOnly: () => void;
  retry: () => void;
}

/** Runs the practice round a teacher asked for from HQ or the class page, once, when the lobby can take it. */
export function useRehearseAutoStart({ gameCode, enabled, hostSeated, practiceSeated = false, practiceReady = false, botsAllowed, start }: Args): RehearseAutoStart {
  const fired = useRef(false);
  const startRef = useRef(start);
  startRef.current = start;
  const [waitingForSeat, setWaitingForSeat] = useState(false);
  const [seatTimedOut, setSeatTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const skip = () => setSkipped(true);
    window.addEventListener(PRACTICE_SKIP_TO_GAME_EVENT, skip);
    return () => window.removeEventListener(PRACTICE_SKIP_TO_GAME_EVENT, skip);
  }, []);

  useEffect(() => {
    if (!enabled || !hostSeated || fired.current) return;
    const intent = peekRehearseIntentForRoom(gameCode);
    if (!intent) return;
    if (intent.withSeat && !(practiceSeated && (practiceReady || skipped))) {
      setWaitingForSeat(true);
      return;
    }
    fired.current = true;
    setWaitingForSeat(false);
    setSeatTimedOut(false);
    clearRehearseIntent();
    if (botsAllowed) startRef.current(intent);
    else if (intent.withSeat) window.dispatchEvent(new Event(PRACTICE_NEEDS_BOARD_EVENT));
  }, [gameCode, enabled, hostSeated, practiceSeated, practiceReady, skipped, botsAllowed]);

  // A seat that never joins must not leave the teacher in a silent lobby.
  useEffect(() => {
    if (!waitingForSeat || practiceSeated) return;
    const id = setTimeout(() => setSeatTimedOut(true), PRACTICE_SEAT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [waitingForSeat, practiceSeated, attempt]);

  const startBotsOnly = useCallback(() => {
    if (fired.current) return;
    const intent = peekRehearseIntentForRoom(gameCode);
    fired.current = true;
    setSeatTimedOut(false);
    setWaitingForSeat(false);
    clearRehearseIntent();
    if (intent && botsAllowed) startRef.current({ source: intent.source, classExists: intent.classExists });
  }, [gameCode, botsAllowed]);

  const retry = useCallback(() => {
    setSeatTimedOut(false);
    setAttempt((n) => n + 1);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRACTICE_SEAT_RETRY_EVENT));
  }, []);

  return { seatTimedOut: seatTimedOut && waitingForSeat && !practiceSeated, startBotsOnly, retry };
}
