'use client';

import { type MutableRefObject, useCallback, useRef, useState } from 'react';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';
import { type Challenge, challengeAfter, challengeMet } from '@/lib/wordTowerV2/rush/challenges';

export interface ChallengeResult {
  key: number;
  met: boolean;
  challenge: Challenge;
}

export interface ChallengeApi {
  /** Armed for the NEXT word, or null. */
  challenge: Challenge | null;
  challengeRef: MutableRefObject<Challenge | null>;
  challengeResult: ChallengeResult | null;
  clearChallengeResult(): void;
  /** Resolve the armed challenge on a landing, then arm the next one if due. */
  landChallenge(quality: LandingQuality, wordLen: number): void;
  resetChallenge(): void;
}

/** Per-run floor challenges (lib/wordTowerV2/rush/challenges.ts). In memory only. */
export function useChallenge(seedRef: MutableRefObject<number>): ChallengeApi {
  const landedRef = useRef(0);
  const challengeRef = useRef<Challenge | null>(null);
  const keyRef = useRef(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeResult, setResult] = useState<ChallengeResult | null>(null);

  const landChallenge = useCallback(
    (quality: LandingQuality, wordLen: number) => {
      const armed = challengeRef.current;
      if (armed) {
        keyRef.current += 1;
        setResult({ key: keyRef.current, met: challengeMet(armed, quality, wordLen), challenge: armed });
      }
      landedRef.current += 1;
      const next = challengeAfter(landedRef.current, seedRef.current);
      challengeRef.current = next;
      setChallenge(next);
    },
    [seedRef],
  );

  const resetChallenge = useCallback(() => {
    landedRef.current = 0;
    challengeRef.current = null;
    setChallenge(null);
    setResult(null);
  }, []);

  const clearChallengeResult = useCallback(() => setResult(null), []);

  return { challenge, challengeRef, challengeResult, clearChallengeResult, landChallenge, resetChallenge };
}
