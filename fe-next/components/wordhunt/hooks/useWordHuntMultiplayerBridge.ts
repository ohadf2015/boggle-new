/**
 * useWordHuntMultiplayerBridge
 *
 * Adapter hook that maps Zustand MP word-hunt state to SP-compatible props
 * for reusing SurvivalClueBoxes, SurvivalLifeBar, and SurvivalGridSection.
 *
 * Converts MP LetterFeedback ('correct'|'present'|'absent') strings
 * to SP LetterFeedback ({letter, feedback: 'green'|'yellow'|'gray', position}) objects.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useWordHuntTargetLength,
  useWordHuntTargetCategory,
  useWordHuntMyLife,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntTargetFoundBy,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
  useWordHuntDiscoveryClues,
  useWordHuntKnownLetters,
} from '@/hooks/gameState/store';
import type { LetterFeedback as MPLetterFeedback } from '@/shared/types/game';
import type { LetterFeedback as SPLetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';
import { inferTargetLetterCounts, computeYellowState } from '@/utils/wordHuntYellowLogic';

import { FEEDBACK_OVERLAY_DURATION } from '@/components/daily/survival/constants';
const WRONG_GUESS_SHAKE_DURATION = 400;

/** Map MP feedback string to SP feedback string */
function convertFeedback(mp: MPLetterFeedback): SPLetterFeedback['feedback'] {
  switch (mp) {
    case 'correct': return 'green';
    case 'present': return 'yellow';
    case 'absent': return 'gray';
    default: return 'gray';
  }
}

/** Convert an MP attempt to SP TargetAttempt format */
function convertAttempt(
  attempt: { guess: string; feedback: MPLetterFeedback[]; isDiscovery?: boolean }
): TargetAttempt {
  const feedback: SPLetterFeedback[] = attempt.feedback.map((fb, i) => ({
    letter: (attempt.guess[i] || '?').toUpperCase(),
    feedback: convertFeedback(fb),
    position: i,
  }));

  return {
    word: attempt.guess,
    feedback,
    timestamp: Date.now(),
    isDiscovery: attempt.isDiscovery,
  };
}

export interface WordHuntMultiplayerBridgeResult {
  lifePoints: number;
  targetFound: boolean;
  /** Username of who found the target (null if not yet found) */
  targetFoundBy: string | null;
  targetLength: number;
  targetCategory: string | null;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  attempts: TargetAttempt[];
  accumulatedClues: Map<number, AccumulatedClue>;
  knownLetters: Set<string>;
  currentHint: HintLevel;
  showFeedbackOverlay: boolean;
  latestAttemptFeedback: SPLetterFeedback[] | null;
  wrongGuessShake: boolean;
  isGameOver: boolean;
  isClueGaining: boolean;
}

export function useWordHuntMultiplayerBridge(): WordHuntMultiplayerBridgeResult {
  const storedTargetLength = useWordHuntTargetLength();
  const targetCategory = useWordHuntTargetCategory();
  const myLife = useWordHuntMyLife();
  const targetAttempts = useWordHuntTargetAttempts();
  const targetFound = useWordHuntTargetFound();
  const targetFoundBy = useWordHuntTargetFoundBy();
  const playerLives = useWordHuntPlayerLives();
  const eliminatedPlayers = useWordHuntEliminatedPlayers();
  const discoveryClues = useWordHuntDiscoveryClues();
  const discoveryKnownLetters = useWordHuntKnownLetters();

  // Convert MP attempts to SP format
  const attempts = useMemo(
    () => targetAttempts.map(convertAttempt),
    [targetAttempts]
  );

  // Effective target length: when the store hasn't received a length yet
  // (late-join, reconnect race, missed startGame), derive it from existing
  // server-validated signals so HintBoxes still render the target row.
  const targetLength = useMemo(() => {
    if (storedTargetLength > 0) return storedTargetLength;
    // Non-discovery attempts have feedback that matches the target length.
    for (const a of attempts) {
      if (!a.isDiscovery && a.feedback.length > 0) return a.feedback.length;
    }
    // Last resort: at minimum cover positions we've already revealed.
    if (discoveryClues.length > 0) {
      return Math.max(...discoveryClues.map(c => c.position)) + 1;
    }
    return 0;
  }, [storedTargetLength, attempts, discoveryClues]);

  // Compute accumulated clues: merge target guess feedback + discovery clues from found words
  const accumulatedClues = useMemo(() => {
    const clues = new Map<number, AccumulatedClue>();

    // Discovery clues from board words (server-computed, mirrors SP logic)
    for (const dc of discoveryClues) {
      clues.set(dc.position, { letter: dc.letter.toUpperCase(), type: 'green' });
    }

    // Target guess feedback: only GREEN (exact position matches) go into accumulatedClues.
    // Yellow letters go to knownLetters only (mirrors SP useSurvivalClues behavior).
    // The HintBoxes component handles yellow display via its own persistedLetters logic.
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'green') {
          clues.set(fb.position, { letter: fb.letter, type: 'green' });
        }
      }
    }
    return clues;
  }, [attempts, discoveryClues]);

  // Collect known letters using shared yellow logic (handles green-removes-yellow + capping)
  const knownLetters = useMemo(() => {
    const letterCounts = inferTargetLetterCounts(attempts);
    const { knownLetters: computed } = computeYellowState(attempts, letterCounts, accumulatedClues);
    // Add server-computed known letters from word discoveries
    for (const letter of discoveryKnownLetters) {
      computed.add(letter.toUpperCase());
    }
    return computed;
  }, [attempts, discoveryKnownLetters, accumulatedClues]);

  // Synthetic hint: show discovered letters, underscores for unknown positions
  const currentHint = useMemo<HintLevel>(() => ({
    hint: Array.from({ length: targetLength }, (_, i) => {
      const clue = accumulatedClues.get(i);
      return clue?.type === 'green' ? clue.letter.toUpperCase() : '_';
    }).join(' '),
    level: 0,
    unlockCost: 0,
  }), [targetLength, accumulatedClues]);

  // Feedback overlay timer
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);
  const prevAttemptsLengthRef = useRef(targetAttempts.length);

  useEffect(() => {
    if (targetAttempts.length > prevAttemptsLengthRef.current) {
      setShowFeedbackOverlay(true);
      const timer = setTimeout(() => setShowFeedbackOverlay(false), FEEDBACK_OVERLAY_DURATION);
      prevAttemptsLengthRef.current = targetAttempts.length;
      return () => clearTimeout(timer);
    }
    prevAttemptsLengthRef.current = targetAttempts.length;
    return undefined;
  }, [targetAttempts.length]);

  // Latest attempt feedback (converted)
  const latestAttemptFeedback = useMemo(() => {
    if (attempts.length === 0) return null;
    return attempts[attempts.length - 1].feedback;
  }, [attempts]);

  // Wrong guess shake (400ms pulse when a non-correct attempt arrives)
  const [wrongGuessShake, setWrongGuessShake] = useState(false);
  const prevShakeLengthRef = useRef(targetAttempts.length);

  useEffect(() => {
    if (targetAttempts.length > prevShakeLengthRef.current && !targetFound) {
      setWrongGuessShake(true);
      const timer = setTimeout(() => setWrongGuessShake(false), WRONG_GUESS_SHAKE_DURATION);
      prevShakeLengthRef.current = targetAttempts.length;
      return () => clearTimeout(timer);
    }
    prevShakeLengthRef.current = targetAttempts.length;
    return undefined;
  }, [targetAttempts.length, targetFound]);

  // Clue gain animation - triggers when discovery clues arrive
  const [isClueGaining, setIsClueGaining] = useState(false);
  const prevDiscoveryCluesLengthRef = useRef(discoveryClues.length);

  useEffect(() => {
    if (discoveryClues.length > prevDiscoveryCluesLengthRef.current) {
      setIsClueGaining(true);
      const timer = setTimeout(() => setIsClueGaining(false), 800);
      prevDiscoveryCluesLengthRef.current = discoveryClues.length;
      return () => clearTimeout(timer);
    }
    prevDiscoveryCluesLengthRef.current = discoveryClues.length;
    return undefined;
  }, [discoveryClues.length]);

  const isGameOver = myLife <= 0 || targetFound;

  return {
    lifePoints: myLife,
    targetFound,
    targetFoundBy: targetFoundBy ?? null,
    targetLength,
    targetCategory,
    playerLives,
    eliminatedPlayers,
    attempts,
    accumulatedClues,
    knownLetters,
    currentHint,
    showFeedbackOverlay,
    latestAttemptFeedback,
    wrongGuessShake,
    isGameOver,
    isClueGaining,
  };
}
