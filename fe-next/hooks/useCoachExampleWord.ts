'use client';

import { useEffect, useRef, useState } from 'react';
import {
  pickCoachExampleWord,
  stageWantsExampleWord,
  type StuckStage,
} from '@/lib/ftue/mpStuckCoach';

interface Args {
  stage: StuckStage;
  grid: string[][] | null | undefined;
  language: string;
}

/**
 * Fetches ONE word that is actually on the stuck player's board, so the coach
 * can say "Try: CAT" instead of only "drag across letters to spell a word".
 *
 * Fires at most once per mount and only for the stages where a concrete word
 * helps — `/api/solve-grid` is rate-limited (30/min/IP) and computationally
 * expensive, and this must never become a per-frame or per-stage-change fetch.
 * Failure is silent by design: the card falls back to its generic copy, which is
 * exactly what shipped before.
 */
export function useCoachExampleWord({ stage, grid, language }: Args): string | null {
  const [word, setWord] = useState<string | null>(null);
  /** In flight right now — stops parallel duplicates without latching failures off. */
  const inFlightRef = useRef(false);
  /** Resolved a word — the real one-shot. Only set on success. */
  const settledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (settledRef.current || inFlightRef.current) return;
    if (!stageWantsExampleWord(stage)) return;
    if (!grid?.length) return;

    inFlightRef.current = true;

    // Deliberately NOT aborted on cleanup. `stage` escalates and `grid` gets a
    // new identity each round, so a cleanup-abort would kill the only attempt
    // mid-flight and — with a latch set before the response — never retry,
    // leaving the generic copy up forever with no trace. A mounted guard is the
    // right tool here; the request is cheap once and self-limiting via the refs.
    fetch('/api/solve-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid, language }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const picked = pickCoachExampleWord(j?.words);
        if (!picked) return;
        settledRef.current = true;
        if (mountedRef.current) setWord(picked);
      })
      .catch(() => {
        /* generic copy is a fine fallback — never surface this to the player */
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [stage, grid, language]);

  return word;
}
