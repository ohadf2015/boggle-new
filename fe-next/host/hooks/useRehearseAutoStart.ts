'use client';

import { useEffect, useRef, useState } from 'react';
import { clearRehearseIntent, peekRehearseIntent, type RehearseIntent } from '@/lib/education/rehearsal';

interface Args {
  enabled: boolean;
  /** The server has the host in the room; before that, setAutoFill is refused as not-in-game. */
  hostSeated: boolean;
  start: (intent: RehearseIntent) => void;
}

/** Runs the practice round a teacher asked for from HQ or the class page, once, when the lobby can take it. */
export function useRehearseAutoStart({ enabled, hostSeated, start }: Args): void {
  const [intent] = useState(() => (enabled ? peekRehearseIntent() : null));
  const fired = useRef(false);
  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => {
    if (!enabled || !intent || !hostSeated || fired.current) return;
    fired.current = true;
    clearRehearseIntent();
    startRef.current(intent);
  }, [enabled, intent, hostSeated]);
}
