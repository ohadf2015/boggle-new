'use client';

/**
 * The "+N" floater pool, fed ONLY by the server's `wordAccepted.score`
 * (mpFeedback lastWord — it already includes the combo). The round frame
 * (useRoundJuice) runs every grid mode, blast included, so every MP mode
 * shows the same server number.
 */
import { useEffect, useRef, useState } from 'react';
import { useMpLastWord } from '@/hooks/useMpFeedback';
import type { MpLastWord } from '@/lib/multiplayer/mpFeedback';

/** Floaters alive at once (perf rule 6). */
export const MAX_FLOATERS = 3;
export const FLOATER_MS = 520;

export interface RoundFloater {
  id: string;
  points: number;
}

/** The accepted word recorded since this component mounted (older ones belong to a previous round). */
export function useFreshLastWord(): MpLastWord | null {
  const lastWord = useMpLastWord();
  const [mountedAt] = useState(() => Date.now());
  return lastWord && lastWord.ts >= mountedAt ? lastWord : null;
}

/** Pool one floater per fresh accepted word with points > 0; each lives FLOATER_MS. */
export function useServerFloaters(word: MpLastWord | null): RoundFloater[] {
  const [floaters, setFloaters] = useState<RoundFloater[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!word || word.points <= 0) return;
    const f = { id: word.id, points: word.points };
    setFloaters((prev) => [...prev, f].slice(-MAX_FLOATERS));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setFloaters((prev) => prev.filter((x) => x.id !== f.id));
    }, FLOATER_MS);
    timers.current.add(timer);
    // Keyed on the event id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id]);

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  return floaters;
}
