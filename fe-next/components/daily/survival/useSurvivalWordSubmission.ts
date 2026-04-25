'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { LetterGrid, Language } from '@/types';
import { getLetterFeedback, isTargetWordFound, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { calculateLifeReward, calculateTokenReward } from '@/utils/aiHintGenerator';
import type { FeedbackType } from '../WordFeedbackToast';
import type { WordDiscovery, TargetAttempt } from './types';
import type { SurvivalAction } from './survivalGameReducer';
import {
  MAX_ATTEMPTS,
  INITIAL_LIFE,
  INVALID_WORD_PENALTY,
  NOT_IN_DICTIONARY_PENALTY,
  FEEDBACK_OVERLAY_DURATION,
  getLifeBonusForWord,
} from './constants';
import { isWordOnBoard, normalizeWord } from '@/utils/clientWordValidator';
import { MIN_DISCOVERY_WORD_LENGTH, MAX_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { formatRewardMessage } from '@/utils/formatRewardMessage';
import { recordNotOnBoard, recordNotInDictionary } from '@/utils/invalidWordTracker';
import type { useSafeTimeout } from '@/hooks/useSafeTimeout';

type SafeTimeout = ReturnType<typeof useSafeTimeout>;

export interface UseSurvivalWordSubmissionProps {
  grid: LetterGrid;
  language: Language;
  targetWord: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  // State reads
  isGameOver: boolean;
  attempts: TargetAttempt[];
  discoveredWords: WordDiscovery[];
  lifePoints: number;
  // Dispatch
  dispatch: React.Dispatch<SurvivalAction>;
  // Callbacks
  showToast: (type: FeedbackType, message: string, word?: string) => void;
  playWordAcceptedSound: (() => void) | undefined;
  playWordRejectedSound: (() => void) | undefined;
  clueActions: {
    updateCluesFromFeedback: (feedback: LetterFeedback[], attempts: TargetAttempt[]) => void;
    updateCluesFromDiscovery: (word: string) => number;
    triggerClueGainAnimation: (count: number) => void;
  };
  // Timers
  feedbackTimeout: SafeTimeout;
  lifeAnimationTimeout: SafeTimeout;
  // Ref for game over callback
  handleGameOverRef: React.MutableRefObject<((won: boolean, finalAttempts?: TargetAttempt[]) => void) | null>;
}

export interface SurvivalWordSubmissionActions {
  handleWordSubmit: (word: string) => void;
  handleWordChange: (word: string, count: number) => void;
  validateWordInDictionary: (word: string) => Promise<boolean>;
}

export function useSurvivalWordSubmission({
  grid,
  language,
  targetWord,
  t,
  isGameOver,
  attempts,
  discoveredWords,
  lifePoints,
  dispatch,
  showToast,
  playWordAcceptedSound,
  playWordRejectedSound,
  clueActions,
  feedbackTimeout,
  lifeAnimationTimeout,
  handleGameOverRef,
}: UseSurvivalWordSubmissionProps): SurvivalWordSubmissionActions {
  // Callback refs for circular dependencies
  const handleTargetAttemptRef = useRef<((word: string, target: string) => void) | null>(null);
  const handleWordDiscoveryRef = useRef<((word: string) => void) | null>(null);
  const handleDiscoveryFeedbackRef = useRef<((word: string, target: string) => void) | null>(null);

  // Dictionary validation
  const validateWordInDictionary = useCallback(async (word: string): Promise<boolean> => {
    if (word.toLowerCase() === targetWord.toLowerCase()) return true;

    try {
      const response = await fetch('/api/dictionary/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.toLowerCase(), language }),
      });
      const data = await response.json();
      return data.isValid === true;
    } catch {
      return true;
    }
  }, [language, targetWord]);

  // Handle word change from grid
  const handleWordChange = useCallback((word: string, count: number) => {
    dispatch({ type: 'SET_FORMED_WORD', payload: { word, count } });
  }, [dispatch]);

  // Handle target attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    const normalizedWord = normalizeWord(word, language);
    if (attempts.some(a => normalizeWord(a.word, language) === normalizedWord)) {
      playWordRejectedSound?.();
      showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
      return;
    }

    const feedback = getLetterFeedback(word, target, language);

    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_ATTEMPT', payload: { attempt: newAttempt } });
    playWordAcceptedSound?.();

    const newAttempts = [...attempts, newAttempt];
    clueActions.updateCluesFromFeedback(feedback, newAttempts);

    feedbackTimeout.clear();
    dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: true, feedback } });

    feedbackTimeout.set(() => {
      dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: false } });
    }, FEEDBACK_OVERLAY_DURATION);

    const won = isTargetWordFound(feedback);
    if (won) {
      feedbackTimeout.clear();
      handleGameOverRef.current?.(true, newAttempts);
      return;
    }

    dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });

    const targetAttemptCount = newAttempts.filter(a => !a.isDiscovery).length;
    if (targetAttemptCount >= MAX_ATTEMPTS) {
      feedbackTimeout.clear();
      handleGameOverRef.current?.(false, newAttempts);
    }
  }, [attempts, playWordAcceptedSound, playWordRejectedSound, t, showToast, clueActions, language, feedbackTimeout, dispatch, handleGameOverRef]);

  // Handle discovery feedback (for different-length words)
  const handleDiscoveryFeedback = useCallback((word: string, target: string) => {
    if (word.length < MIN_DISCOVERY_WORD_LENGTH) return;
    if (word.length > MAX_DISCOVERY_WORD_LENGTH) return;

    const feedback = getLetterFeedback(word, target, language);

    const hasRelevantFeedback = feedback.some(fb => fb.feedback !== 'gray');
    if (!hasRelevantFeedback) return;

    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
      isDiscovery: true,
    };

    dispatch({ type: 'ADD_ATTEMPT', payload: { attempt: newAttempt } });

    const newAttempts = [...attempts, newAttempt];
    clueActions.updateCluesFromFeedback(feedback, newAttempts);

    feedbackTimeout.clear();
    dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: true, feedback } });

    feedbackTimeout.set(() => {
      dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: false } });
    }, FEEDBACK_OVERLAY_DURATION);
  }, [attempts, clueActions, language, feedbackTimeout, dispatch]);

  // Handle word discovery
  const handleWordDiscovery = useCallback(async (word: string) => {
    if (word.length < MIN_DISCOVERY_WORD_LENGTH) {
      playWordRejectedSound?.();
      showToast('too-short', t('wordHunt.feedback.tooShort') || `Minimum ${MIN_DISCOVERY_WORD_LENGTH} letters`);
      return;
    }

    if (word.length > MAX_DISCOVERY_WORD_LENGTH) {
      playWordRejectedSound?.();
      showToast('too-long', t('wordHunt.feedback.tooLong') || `Maximum ${MAX_DISCOVERY_WORD_LENGTH} letters`);
      return;
    }

    if (discoveredWords.some(w => w.word === word)) {
      playWordRejectedSound?.();
      showToast('duplicate', t('wordHunt.feedback.duplicate') || 'Already found!');
      return;
    }

    if (!isWordOnBoard(word, grid, language)) {
      playWordRejectedSound?.();
      dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });
      showToast('not-on-board', t('wordHunt.feedback.notOnBoardPenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
      recordNotOnBoard(word, language, 'daily_word_hunt');
      return;
    }

    const isValidWord = await validateWordInDictionary(word);
    if (!isValidWord) {
      playWordRejectedSound?.();
      dispatch({ type: 'ADJUST_LIFE', payload: { delta: -NOT_IN_DICTIONARY_PENALTY } });
      showToast('not-in-dictionary', t('wordHunt.feedback.notInDictionary') || `Not a word -${NOT_IN_DICTIONARY_PENALTY}`);
      recordNotInDictionary(word, language, 'daily_word_hunt');
      return;
    }

    const baseLifeGained = calculateLifeReward(word.length);
    const longWordBonus = getLifeBonusForWord(word.length);
    const lifeGained = baseLifeGained + longWordBonus;
    const tokensGained = calculateTokenReward(word.length);

    const discovery: WordDiscovery = {
      word,
      lifeGained,
      tokensGained,
      timestamp: Date.now(),
    };

    const newLife = Math.min(INITIAL_LIFE, lifePoints + lifeGained);
    dispatch({ type: 'DISCOVER_WORD', payload: { discovery, newLife } });
    playWordAcceptedSound?.();

    const cluesRevealed = clueActions.updateCluesFromDiscovery(word);

    dispatch({ type: 'SET_LIFE_GAIN_ANIMATION', payload: { amount: lifeGained, isGaining: true } });
    lifeAnimationTimeout.set(() => dispatch({ type: 'STOP_LIFE_ANIMATION' }), 600);

    if (cluesRevealed > 0) {
      clueActions.triggerClueGainAnimation(cluesRevealed);
    }

    const rewardMessage = formatRewardMessage({ lifeGained, tokensGained });
    const bonusMessage = longWordBonus > 0
      ? `${rewardMessage} ${t('wordHunt.survival.longWordBonus', { bonus: longWordBonus })}`
      : rewardMessage;
    showToast('valid-word', bonusMessage, word);
  }, [discoveredWords, lifePoints, grid, language, playWordAcceptedSound, playWordRejectedSound, showToast, t, validateWordInDictionary, clueActions, lifeAnimationTimeout, dispatch]);

  // Handle word submission (main entry point)
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const displayWord = word.toUpperCase();
    const normalizedWord = normalizeWord(displayWord, language);
    const normalizedTarget = normalizeWord(targetWord.toUpperCase(), language);

    if (normalizedWord === normalizedTarget) {
      handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
    } else if (normalizedWord.length === normalizedTarget.length) {
      if (attempts.some(a => normalizeWord(a.word, language) === normalizedWord)) {
        showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
        return;
      }

      if (isWordOnBoard(displayWord, grid, language)) {
        handleWordDiscoveryRef.current?.(displayWord);
        handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
      } else {
        dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });
        showToast('not-on-board', t('wordHunt.feedback.notFormablePenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
        recordNotOnBoard(displayWord, language, 'daily_word_hunt');
      }
    } else {
      handleWordDiscoveryRef.current?.(displayWord);
      handleDiscoveryFeedbackRef.current?.(displayWord, targetWord.toUpperCase());
    }
  }, [isGameOver, attempts, targetWord, grid, language, showToast, t, dispatch]);

  // Keep callback refs in sync
  useEffect(() => {
    handleTargetAttemptRef.current = handleTargetAttempt;
  }, [handleTargetAttempt]);

  useEffect(() => {
    handleWordDiscoveryRef.current = handleWordDiscovery;
  }, [handleWordDiscovery]);

  useEffect(() => {
    handleDiscoveryFeedbackRef.current = handleDiscoveryFeedback;
  }, [handleDiscoveryFeedback]);

  return {
    handleWordSubmit,
    handleWordChange,
    validateWordInDictionary,
  };
}
