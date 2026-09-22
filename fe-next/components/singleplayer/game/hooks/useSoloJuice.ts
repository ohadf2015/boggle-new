'use client';

import { useCallback, useRef, useState } from 'react';
import {
  applySubmission,
  awardedWordPoints,
  initialSoloCombo,
  type SoloComboState,
  type SoloSubmissionResult,
} from '@/lib/soloCombo';
import { applyWord, buildMissions, type SoloMission } from '@/lib/soloMissions';

export interface SoloJuiceInput {
  result: SoloSubmissionResult;
  word: string;
  /** Points the word already earned (canonical score, including fire round). */
  basePts: number;
  elapsedSec: number;
  nowMs: number;
}

export interface SoloJuiceAward {
  /** Word points after the solo combo multiplier. 0 when the word was rejected. */
  wordPts: number;
  bonusPts: number;
}

/**
 * Combo chain + mission board for one solo round.
 * Mounts with the round (SinglePlayerGame unmounts between rounds).
 */
export function useSoloJuice() {
  const [seed] = useState(() => Date.now());
  const comboRef = useRef<SoloComboState>(initialSoloCombo());
  const missionsRef = useRef<SoloMission[]>(buildMissions(seed));
  const bonusRef = useRef(0);
  const [combo, setCombo] = useState<SoloComboState>(comboRef.current);
  const [missions, setMissions] = useState<SoloMission[]>(missionsRef.current);

  const onResult = useCallback((input: SoloJuiceInput): SoloJuiceAward => {
    const next = applySubmission(comboRef.current, input.result, input.nowMs);
    comboRef.current = next;
    setCombo(next);
    if (input.result !== 'ok') return { wordPts: 0, bonusPts: 0 };

    const wordPts = awardedWordPoints(input.basePts, next.multiplier);
    const applied = applyWord(missionsRef.current, input.word, wordPts, input.elapsedSec);
    missionsRef.current = applied.missions;
    bonusRef.current += applied.bonusPts;
    setMissions(applied.missions);
    return { wordPts, bonusPts: applied.bonusPts };
  }, []);

  const snapshot = useCallback(() => ({
    missionBonusPts: bonusRef.current,
    missionsCompleted: missionsRef.current.filter((mission) => mission.done).length,
  }), []);

  return { combo, missions, onResult, snapshot };
}

export function soloResultFromErrorKey(errorKey: string | undefined): SoloSubmissionResult {
  if (errorKey === 'playerView.wordTooShortMin') return 'short';
  if (errorKey === 'playerView.wordAlreadyFound') return 'dup';
  return 'invalid';
}
