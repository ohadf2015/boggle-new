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
} from '@/hooks/gameState/store';
import type { LetterFeedback as MPLetterFeedback } from '@/shared/types/game';
import type { LetterFeedback as SPLetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';

const FEEDBACK_OVERLAY_DURATION = 3000;

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
  isGameOver: boolean;
}

export function useWordHuntMultiplayerBridge(): WordHuntMultiplayerBridgeResult {
  const targetLength = useWordHuntTargetLength();
  const myLife = useWordHuntMyLife();
  const targetAttempts = useWordHuntTargetAttempts();
  const targetFound = useWordHuntTargetFound();
  const playerLives = useWordHuntPlayerLives();
  const eliminatedPlayers = useWordHuntEliminatedPlayers();

  // Convert MP attempts to SP format
  const attempts = useMemo(
    () => targetAttempts.map(convertAttempt),
    [targetAttempts]
  );

  // Compute accumulated clues: green wins over yellow at each position
  const accumulatedClues = useMemo(() => {
    const clues = new Map<number, AccumulatedClue>();
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'green') {
          clues.set(fb.position, { letter: fb.letter, type: 'green' });
        } else if (fb.feedback === 'yellow' && !clues.has(fb.position)) {
          clues.set(fb.position, { letter: fb.letter, type: 'yellow' });
        }
      }
    }
    return clues;
  }, [attempts]);

  // Collect yellow letters (present but wrong position)
  const knownLetters = useMemo(() => {
    const known = new Set<string>();
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'yellow') {
          known.add(fb.letter);
        }
      }
    }
    return known;
  }, [attempts]);

  // Synthetic hint: just underscores
  const currentHint = useMemo<HintLevel>(() => ({
    hint: Array.from({ length: targetLength }, () => '_').join(' '),
    level: 0,
    unlockCost: 0,
  }), [targetLength]);

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
    isGameOver,
  };
}
