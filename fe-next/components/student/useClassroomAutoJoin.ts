'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';

/** Long enough to read the notice and tap "Stay here", short enough that the class is not kept waiting. */
export const AUTO_JOIN_DELAY_MS = 3_000;
export const AUTO_JOIN_HANDLED_KEY = 'lexiclash:classroom-auto-join-handled';

type LiveRecord = ActiveGame & { settings?: { rehearsal?: boolean; lobbyLocked?: boolean } };

function readHandled(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(AUTO_JOIN_HANDLED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function writeHandled(codes: string[]): void {
  try {
    sessionStorage.setItem(AUTO_JOIN_HANDLED_KEY, JSON.stringify(codes.slice(-20)));
  } catch {
    /* storage blocked: this tab still remembers it in state */
  }
}

function autoJoinableCode(game: ActiveGame | null): string | null {
  const g = game as LiveRecord | null;
  if (!g?.gameCode || g.roomOpen === false || g.rehearsal || g.settings?.rehearsal || g.settings?.lobbyLocked) return null;
  return g.gameCode;
}

interface Args {
  activeGame: ActiveGame | null;
  /** The class page's one acked join (useClassroomGameJoin). */
  join: () => void;
  isJoining: boolean;
}

/**
 * A student already on the class page when the teacher opens a game is taken in
 * after a short notice, once per game code per tab: leaving the game or tapping
 * "Stay here" never pulls them back in.
 */
export function useClassroomAutoJoin({ activeGame, join, isJoining }: Args) {
  const [handled, setHandled] = useState<string[]>(readHandled);
  const joinRef = useRef(join);
  useEffect(() => {
    joinRef.current = join;
  });

  const code = autoJoinableCode(activeGame);
  const pendingCode = code && !isJoining && !handled.includes(code) ? code : null;

  const markHandled = useCallback((c: string) => {
    setHandled((prev) => {
      if (prev.includes(c)) return prev;
      const next = [...prev, c];
      writeHandled([...readHandled().filter((x) => !next.includes(x)), ...next]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!pendingCode) return;
    const timer = setTimeout(() => {
      markHandled(pendingCode);
      joinRef.current();
    }, AUTO_JOIN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingCode, markHandled]);

  const stay = useCallback(() => {
    if (pendingCode) markHandled(pendingCode);
  }, [pendingCode, markHandled]);

  const joinNow = useCallback(() => {
    if (activeGame?.gameCode) markHandled(activeGame.gameCode);
    joinRef.current();
  }, [activeGame, markHandled]);

  return { pendingCode, stay, joinNow };
}
