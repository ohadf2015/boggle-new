/**
 * useCompose — shared primitive for the COMPOSE verb.
 *
 * Abstracts ordered word/symbol assembly used in 1.6's spelling seal
 * (player spells `אורי` from a 4-letter pool). Intended for re-use in
 * Book 2's seal puzzles. Owns:
 *   - the ordered composition state (T[])
 *   - exact-order validation (next letter must match target[composed.length])
 *   - an optional broader pool (for "decoys" mode where pool > target)
 *
 * Returns:
 *   - composed (state)
 *   - tryItem(item) — 'correct' | 'wrong' | 'complete'
 *   - isComplete
 *   - reset()
 *
 * Round-4 extraction: completes the {REVEAL, SEQUENCE, COMPOSE} hook
 * trio. All three Book-2 verbs now have a shared primitive.
 */

'use client';

import { useCallback, useState } from 'react';

export type ComposeResult = 'correct' | 'wrong' | 'complete';

export interface UseComposeConfig<T> {
  /** The ordered target the player must spell. */
  target: readonly T[];
}

export interface UseComposeApi<T> {
  /** Letters successfully composed so far (always a prefix of `target`). */
  composed: T[];
  /** True when composed equals target. */
  isComplete: boolean;
  /**
   * Attempt to add `item` as the next letter. Result codes:
   *   'correct'  — appended; not yet at target length
   *   'wrong'    — silent no-op; caller should show shake/whisper
   *   'complete' — final correct letter; isComplete now true
   */
  tryItem: (item: T) => ComposeResult;
  /** Imperatively clear the composition (e.g., on phase change). */
  reset: () => void;
}

export function useCompose<T>(config: UseComposeConfig<T>): UseComposeApi<T> {
  const { target } = config;
  const [composed, setComposed] = useState<T[]>([]);

  const tryItem = useCallback(
    (item: T): ComposeResult => {
      const idx = composed.length;
      const expected = target[idx];
      if (item !== expected) return 'wrong';
      const next = [...composed, item];
      setComposed(next);
      return next.length === target.length ? 'complete' : 'correct';
    },
    [composed, target],
  );

  const reset = useCallback(() => setComposed([]), []);

  const isComplete = composed.length === target.length;

  return { composed, isComplete, tryItem, reset };
}
