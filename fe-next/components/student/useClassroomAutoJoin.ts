'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';

/** Long enough to read the notice and tap "Stay here", short enough that the class is not kept waiting. */
export const AUTO_JOIN_DELAY_MS = 3_000;
export const AUTO_JOIN_HANDLED_KEY = 'lexiclash:classroom-auto-join-handled';

type LiveRecord = ActiveGame & { settings?: { rehearsal?: boolean; lobbyLocked?: boolean } };

// Module-level so a remount still remembers when sessionStorage is blocked (school Chromebooks, webviews).
const handledMemory = new Set<string>();
// One automatic attempt per game per page session, whether or not it was acked.
const attemptedMemory = new Set<string>();

function readStoredHandled(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(AUTO_JOIN_HANDLED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function isHandled(code: string): boolean {
  return handledMemory.has(code) || readStoredHandled().includes(code);
}

/** The student is in that game (join acked) or chose to stay: never auto-join it again in this tab. */
export function markClassroomGameHandled(code: string): void {
  handledMemory.add(code);
  try {
    const stored = readStoredHandled().filter((c) => c !== code);
    sessionStorage.setItem(AUTO_JOIN_HANDLED_KEY, JSON.stringify([...stored, code].slice(-20)));
  } catch {
    /* storage blocked: the module memory still holds it */
  }
}

export function resetAutoJoinMemoryForTest(): void {
  handledMemory.clear();
  attemptedMemory.clear();
}

function autoJoinableCode(game: ActiveGame | null): string | null {
  const g = game as LiveRecord | null;
  if (!g?.gameCode || g.roomOpen === false || g.rehearsal || g.settings?.rehearsal || g.settings?.lobbyLocked) return null;
  return g.gameCode;
}

interface Args {
  activeGame: ActiveGame | null;
  /** The class page's one acked join (useClassroomGameJoin); its ack calls markClassroomGameHandled. */
  join: () => void;
  isJoining: boolean;
}

/**
 * A student already on the class page when the teacher opens a game is taken in
 * after a short notice. Once acked or declined, that game never pulls them back
 * in; a failed automatic join is not retried automatically.
 */
export function useClassroomAutoJoin({ activeGame, join, isJoining }: Args) {
  // Bumped whenever the memory sets change, so the render below re-reads them.
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const joinRef = useRef(join);
  useEffect(() => {
    joinRef.current = join;
  });

  const code = autoJoinableCode(activeGame);
  const pendingCode = code && !isJoining && !attemptedMemory.has(code) && !isHandled(code) ? code : null;

  useEffect(() => {
    if (!pendingCode) return;
    const timer = setTimeout(() => {
      attemptedMemory.add(pendingCode);
      bump();
      joinRef.current();
    }, AUTO_JOIN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingCode, bump]);

  const stay = useCallback(() => {
    if (!pendingCode) return;
    markClassroomGameHandled(pendingCode);
    bump();
  }, [pendingCode, bump]);

  const joinNow = useCallback(() => {
    if (activeGame?.gameCode) attemptedMemory.add(activeGame.gameCode);
    bump();
    joinRef.current();
  }, [activeGame, bump]);

  return { pendingCode, stay, joinNow };
}
