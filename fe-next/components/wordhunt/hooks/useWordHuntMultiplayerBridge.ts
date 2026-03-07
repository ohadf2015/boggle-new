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
  useWordHuntMyLife,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
  useWordHuntDiscoveryClues,
  useWordHuntKnownLetters,
} from '@/hooks/gameState/store';
import type { LetterFeedback as MPLetterFeedback } from '@/shared/types/game';
import type { LetterFeedback as SPLetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';

const FEEDBACK_OVERLAY_DURATION = 3000;
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
  attempt: { guess: string; feedback: MPLetterFeedback[] }
): TargetAttempt {
  const feedback: SPLetterFeedback[] = attempt.feedback.map((fb, i) => ({
    letter: attempt.guess[i] || '?',
    feedback: convertFeedback(fb),
    position: i,
  }));

  return {
    word: attempt.guess,
    feedback,
    timestamp: Date.now(),
  };
}

export interface WordHuntMultiplayerBridgeResult {
  lifePoints: number;
  targetFound: boolean;
  targetLength: number;
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
}

export function useWordHuntMultiplayerBridge(): WordHuntMultiplayerBridgeResult {
  const targetLength = useWordHuntTargetLength();
  const myLife = useWordHuntMyLife();
  const targetAttempts = useWordHuntTargetAttempts();
  const targetFound = useWordHuntTargetFound();
  const playerLives = useWordHuntPlayerLives();
  const eliminatedPlayers = useWordHuntEliminatedPlayers();
  const discoveryClues = useWordHuntDiscoveryClues();
  const discoveryKnownLetters = useWordHuntKnownLetters();

  // Convert MP attempts to SP format
  const attempts = useMemo(
    () => targetAttempts.map(convertAttempt),
    [targetAttempts]
  );

  // Compute accumulated clues: merge target guess feedback + discovery clues from found words
  const accumulatedClues = useMemo(() => {
    const clues = new Map<number, AccumulatedClue>();

    // Discovery clues from board words (server-computed, mirrors SP logic)
    for (const dc of discoveryClues) {
      clues.set(dc.position, { letter: dc.letter, type: 'green' });
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

  // Collect known letters from target guesses + discovery
  const knownLetters = useMemo(() => {
    const known = new Set<string>();
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'yellow') {
          known.add(fb.letter);
        }
      }
    }
    // Add server-computed known letters from word discoveries
    for (const letter of discoveryKnownLetters) {
      known.add(letter);
    }
    return known;
  }, [attempts, discoveryKnownLetters]);

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

  const isGameOver = myLife <= 0 || targetFound;

  return {
    lifePoints: myLife,
    targetFound,
    targetLength,
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
  };
}
