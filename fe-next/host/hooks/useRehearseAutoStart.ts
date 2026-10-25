'use client';

import { useEffect, useRef } from 'react';
import { clearRehearseIntent, peekRehearseIntent, type RehearseIntent } from '@/lib/education/rehearsal';

interface Args {
  enabled: boolean;
  /** The server has the host in the room; before that, setAutoFill is refused as not-in-game. */
  hostSeated: boolean;
  /** False when the room's mode ignores bots: the lobby's switch-to-Classic offer takes over instead. */
  botsAllowed: boolean;
  start: (intent: RehearseIntent) => void;
}

/** Runs the practice round a teacher asked for from HQ or the class page, once, when the lobby can take it. */
export function useRehearseAutoStart({ enabled, hostSeated, botsAllowed, start }: Args): void {
  const fired = useRef(false);
  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => {
    if (!enabled || !hostSeated || fired.current) return;
    const intent = peekRehearseIntent();
    if (!intent) return;
    fired.current = true;
    clearRehearseIntent();
    if (botsAllowed) startRef.current(intent);
  }, [enabled, hostSeated, botsAllowed]);
}
