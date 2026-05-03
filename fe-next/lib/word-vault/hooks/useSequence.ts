/**
 * useSequence — shared primitive for the SEQUENCE verb.
 *
 * Abstracts the order-discovery mechanic used in 1.4 (Cold Stove) and intended
 * for re-use in Book 2's "thaw in correct order" rooms. Owns:
 *   - the player's current attempt (T[])
 *   - graduated feedback: wrong attempt KEEPS the longest correct prefix
 *     (instead of full reset) so progress is never erased without cause
 *   - dedupe: tapping a step already in the attempt is a no-op
 *   - red-herring support: an optional ID that fires a callback but never
 *     advances the sequence (1.4's broken time-valve)
 *   - initial-sequence seeding (1.4's brass-key auto-snaps the first valve)
 *
 * Returns:
 *   - sequence (state)
 *   - tryStep(id) — attempt to append; returns 'correct' | 'wrong' | 'redherring' | 'duplicate'
 *   - resetTo(prefix) — for callers that want to delay the rewind animation
 *
 * Round-4 extraction goal: prove the abstraction against 1.4 before Book 2's
 * ice-themed sequence rooms inherit the contract.
 */

'use client';

import { useCallback, useState } from 'react';

export type StepResult = 'correct' | 'wrong' | 'redherring' | 'duplicate' | 'complete';

export interface UseSequenceConfig<T> {
  /** Canonical order the player must discover. */
  correctOrder: readonly T[];
  /**
   * Optional initial sequence. Use for cross-room item perks that pre-fill steps
   * (e.g., brass-key auto-snaps the first valve in 1.4).
   */
  initialSequence?: readonly T[];
  /**
   * Optional ID that fires `onRedHerring` when tapped but never advances the sequence.
   * Used for 1.4's broken time-valve red herring.
   */
  redHerringId?: T;
  /** Called when player taps the red-herring step. */
  onRedHerring?: () => void;
}

export interface UseSequenceApi<T> {
  /** Current attempt order (longest-correct-prefix kept on wrong attempts). */
  sequence: T[];
  /** True when the sequence is fully and correctly built. */
  isComplete: boolean;
  /**
   * Attempt to append a step. Result codes:
   *   'correct'    — appended; matches CORRECT_ORDER so far
   *   'wrong'      — caller should rewind; longest correct prefix is auto-set after `rewindMs`
   *   'redherring' — silent no-op; onRedHerring fired
   *   'duplicate'  — silent no-op; step already in sequence
   *   'complete'   — final correct step; isComplete now true
   */
  tryStep: (id: T, rewindMs?: number) => StepResult;
  /** Imperatively replace the sequence. */
  setSequence: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useSequence<T>(config: UseSequenceConfig<T>): UseSequenceApi<T> {
  const { correctOrder, initialSequence, redHerringId, onRedHerring } = config;

  const [sequence, setSequence] = useState<T[]>(() => [...(initialSequence ?? [])]);

  const tryStep = useCallback(
    (id: T, rewindMs: number = 2400): StepResult => {
      // Red herring — never advances
      if (redHerringId !== undefined && id === redHerringId) {
        onRedHerring?.();
        return 'redherring';
      }

      // Dedupe — already attempted in this round
      if (sequence.includes(id)) return 'duplicate';

      const next = [...sequence, id];
      const isCorrectSoFar = next.every((v, i) => v === correctOrder[i]);

      if (!isCorrectSoFar) {
        // Compute longest correct prefix (graduated feedback)
        const prefix: T[] = [];
        for (let i = 0; i < next.length; i++) {
          if (next[i] === correctOrder[i]) prefix.push(next[i]);
          else break;
        }
        // Show the wrong tail briefly, then rewind
        setSequence(next);
        setTimeout(() => setSequence(prefix), rewindMs);
        return 'wrong';
      }

      setSequence(next);
      return next.length === correctOrder.length ? 'complete' : 'correct';
    },
    [sequence, correctOrder, redHerringId, onRedHerring],
  );

  const isComplete =
    sequence.length === correctOrder.length &&
    sequence.every((v, i) => v === correctOrder[i]);

  return { sequence, isComplete, tryStep, setSequence };
}
