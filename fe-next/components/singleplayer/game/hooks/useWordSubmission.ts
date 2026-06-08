'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { getComboBonus as calculateComboBonus, calculateWordScore as canonicalWordScore } from '@/shared/utils/scoring';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import { recordNotOnBoard, recordNotInDictionary } from '@/utils/invalidWordTracker';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { usePrevalidation } from '@/hooks/usePrevalidation';
import { evaluateWordAchievements } from '@/lib/achievements/hiddenAchievementBus';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { ComboSystemReturn } from '@/hooks/useComboSystem';
import type { UseSpamDetectionReturn } from './useSpamDetection';

interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

interface UseWordSubmissionOptions {
  /** Game language */
  language: Language;
  /** Minimum word length */
  minWordLength: number;
  /** Current grid (ref is kept in sync) */
  grid: LetterGrid | null;
  /** Game start time for pace analysis */
  gameStartTime: number;
  /** Function to get current fire round multiplier */
  getScoreMultiplier: () => number;
  /** Whether fire round is active */
  fireRoundActive: boolean;
  /** Combo system hook return */
  combo: ComboSystemReturn;
  /** Spam detection hook return */
  spamDetection: UseSpamDetectionReturn;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string | undefined;
  /** Sound effects */
  playWordAcceptedSound: () => void;
  playComboSound: (level: number) => void;
  /** Announcer functions for accessibility */
  announceWordResult: (word: string, isValid: boolean, score?: number, message?: string) => void;
  announceCombo: (level: number) => void;
  /** Training callbacks (optional) */
  onTrainingTrackValidWord?: (wordLength: number) => void;
  /** Callback when hint timer should reset */
  onWordFound?: () => void;
  /** Callback when a word is accepted with full context (word, score, bonuses) */
  onWordAccepted?: (data: { word: string; score: number; comboBonus: number; fireRoundBonus: number }) => void;
}

interface UseWordSubmissionReturn {
  /** List of found words with their state */
  foundWords: FoundWord[];
  /** Current score */
  score: number;
  /** Current feedback for WordFormingArea */
  currentFeedback: WordFeedback | null;
  /** Handle word submission */
  handleWordSubmit: (word: string) => void;
  /** Ref to found words for game end processing */
  foundWordsRef: React.RefObject<FoundWord[]>;
  /** Ref to found words set for duplicate checking */
  foundWordsSetRef: React.RefObject<Set<string>>;
  /** Reset state for new game */
  resetWordSubmission: () => void;
  /** Prefetch validation for a word being formed (call as user types) */
  prefetchValidation: (word: string) => void;
}

/**
 * Hook to handle word submission, validation, and scoring
 * Manages found words, score, and feedback state
 */
export function useWordSubmission({
  language,
  minWordLength,
  grid,
  gameStartTime,
  getScoreMultiplier,
  fireRoundActive,
  combo,
  spamDetection,
  t,
  playWordAcceptedSound,
  playComboSound,
  announceWordResult,
  announceCombo,
  onTrainingTrackValidWord,
  onWordFound,
  onWordAccepted,
}: UseWordSubmissionOptions): UseWordSubmissionReturn {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const feedbackClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear feedback after 3s for terminal states (accepted/rejected/duplicate)
  useEffect(() => {
    if (feedbackClearTimerRef.current) {
      clearTimeout(feedbackClearTimerRef.current);
      feedbackClearTimerRef.current = null;
    }
    if (currentFeedback && ['accepted', 'rejected', 'duplicate'].includes(currentFeedback.type)) {
      feedbackClearTimerRef.current = setTimeout(() => {
        setCurrentFeedback(null);
        feedbackClearTimerRef.current = null;
      }, 3000);
    }
    return () => {
      if (feedbackClearTimerRef.current) {
        clearTimeout(feedbackClearTimerRef.current);
      }
    };
  }, [currentFeedback]);

  // Client-side dictionary cache for instant validation
  const { checkWord: checkWordInCache, isLoaded: isDictionaryCacheLoaded } = useDictionaryCache(language);

  // Pre-validation cache for words being typed
  const { prefetch: prefetchValidation, getCached: getPrevalidationCached, clearCache: clearPrevalidationCache } = usePrevalidation(language);

  // Refs for latest values (to avoid stale closures)
  const foundWordsRef = useRef<FoundWord[]>([]);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gridRef = useRef(grid);

  // Keep refs in sync
  useEffect(() => {
    foundWordsRef.current = foundWords;
  }, [foundWords]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Calculate word score using canonical scoring
  const calculateWordScore = useCallback((word: string, currentComboLevel: number): number => {
    return canonicalWordScore(word, currentComboLevel, getScoreMultiplier());
  }, [getScoreMultiplier]);

  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const now = Date.now();

    // Spam detection check
    const spamResult = spamDetection.checkSubmission();
    if (!spamResult.allowed) {
      if (spamResult.isCooldown) {
        const msg = spamResult.remainingCooldown
          ? t('playerView.slowDown') || `Slow down! Wait ${spamResult.remainingCooldown}s`
          : t('playerView.tooFast') || 'Too fast! 3s cooldown';
        setCurrentFeedback({
          id: `spam-${now}`,
          type: 'rejected',
          word: normalizedWord,
          message: msg,
          timestamp: now,
        });
        if (!spamResult.remainingCooldown) {
          combo.resetCombo();
        }
      }
      return;
    }

    // Warning for approaching limit
    if (spamResult.isWarning) {
      // Show warning but continue processing
    }

    // Step 1: Local validation
    const localValidation = validateWordLocally(
      normalizedWord,
      language,
      minWordLength,
      foundWords.map(fw => ({ word: fw.word, isValid: fw.isValid }))
    );

    if (!localValidation.isValid) {
      const errorKey = localValidation.errorKey ?? 'Invalid word';
      const params = localValidation.errorParams?.min
        ? { min: String(localValidation.errorParams.min) }
        : undefined;
      const msg = (params ? t(errorKey, params) : t(errorKey)) || errorKey;
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, msg);
      combo.resetCombo();
      return;
    }

    // Step 2: Check if word exists on board
    const currentGrid = gridRef.current;
    if (!currentGrid || !isWordOnBoard(normalizedWord, currentGrid, language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: notOnBoardMsg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, notOnBoardMsg);
      combo.resetCombo();
      recordNotOnBoard(normalizedWord, language, 'single_player');
      return;
    }

    // Step 3: Check for duplicates
    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: alreadyFoundMsg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, alreadyFoundMsg);
      combo.resetCombo();
      return;
    }

    // Add to set immediately to prevent double submission
    foundWordsSetRef.current.add(normalizedWord);

    const currentCombo = combo.comboLevelRef.current;
    const baseScore = calculateWordScore(normalizedWord, 0);
    const fullScore = calculateWordScore(normalizedWord, currentCombo);
    const timeSinceStart = (now - gameStartTime) / 1000;

    // Step 4: Add word with pending state
    const newWord: FoundWord = {
      word: normalizedWord,
      score: baseScore,
      timestamp: now,
      timeSinceStart,
      isValid: null,
    };
    foundWordsRef.current = [...foundWordsRef.current, newWord];
    setFoundWords(foundWordsRef.current);

    // Helper function to handle valid word
    const handleValidWord = () => {
      const comboBonus = calculateComboBonus(currentCombo, normalizedWord.length);
      const scoreWithoutMultiplier = canonicalWordScore(normalizedWord, currentCombo, 1);
      const multiplier = getScoreMultiplier();
      const fireRoundBonus = multiplier > 1 ? scoreWithoutMultiplier : 0;

      // Update found words
      foundWordsRef.current = foundWordsRef.current.map(fw =>
        fw.word === normalizedWord && fw.timestamp === now
          ? { ...fw, isValid: true, score: fullScore, comboBonus, fireRoundBonus }
          : fw
      );
      setFoundWords(foundWordsRef.current);

      // Update score
      setScore(prev => prev + fullScore);
      playWordAcceptedSound();
      hapticForWordScore(normalizedWord.length);

      // Notify consumers with full context (used by Blast mode for tile clearing)
      onWordAccepted?.({ word: normalizedWord, score: fullScore, comboBonus, fireRoundBonus });

      // Notify hint system
      onWordFound?.();

      // Update combo
      combo.incrementCombo(true);

      // Training callback
      onTrainingTrackValidWord?.(normalizedWord.length);

      if (combo.validWordCount > 1) {
        playComboSound(currentCombo + 1);
      }

      // Show accepted feedback
      setCurrentFeedback({
        id: `accept-${now}`,
        type: 'accepted',
        word: normalizedWord.toUpperCase(),
        score: fullScore,
        fireRoundActive,
        fireRoundBonus,
        timestamp: now,
      });
      announceWordResult(normalizedWord, true, fullScore);
      announceCombo(currentCombo + 1);

      // Hidden achievements (cosmetic, fire-and-forget): word-pattern easter eggs.
      // Snapshot every valid word's elapsed time so speed-based eggs can evaluate.
      evaluateWordAchievements({
        word: normalizedWord,
        validWordTimesSec: foundWordsRef.current
          .filter((fw) => fw.isValid === true)
          .map((fw) => fw.timeSinceStart),
      });
    };

    // Helper function to handle invalid word (not in dictionary)
    const handleInvalidWord = () => {
      combo.resetCombo();

      // Mark the word as invalid in found words
      foundWordsRef.current = foundWordsRef.current.map(fw =>
        fw.word === normalizedWord && fw.timestamp === now
          ? { ...fw, isValid: false, score: 0 }
          : fw
      );
      setFoundWords(foundWordsRef.current);

      const invalidMsg = t('playerView.invalidWord') || 'Not a valid word';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord.toUpperCase(),
        message: invalidMsg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, invalidMsg);
      recordNotInDictionary(normalizedWord, language, 'single_player');
    };

    // Step 4.5: Try client-side dictionary cache for INSTANT validation
    // Only short-circuit on cache HIT (word found = valid). A cache miss
    // falls through to prevalidation / API because the local cache may be
    // incomplete.
    if (isDictionaryCacheLoaded && checkWordInCache(normalizedWord)) {
      handleValidWord();
      return;
    }

    // Step 4.6: Check prevalidation cache (from typing-ahead)
    const prevalidated = getPrevalidationCached(normalizedWord);
    if (prevalidated === true) {
      // Word was prevalidated while typing - instant validation!
      handleValidWord();
      return;
    } else if (prevalidated === false) {
      // Word was prevalidated as invalid - instant rejection!
      handleInvalidWord();
      return;
    }

    // Step 5: Check dictionary via backend API (fallback for words not in cache)
    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language }),
    })
      .then(res => {
        if (!res.ok) {
          return { isValid: false, source: 'error' };
        }
        return res.json();
      })
      .then(result => {
        if (result.isValid) {
          handleValidWord();
        } else {
          handleInvalidWord();
        }
      })
      .catch(() => {
        // On API error, treat as invalid
        const errorNow = Date.now();
        combo.resetCombo();

        foundWordsRef.current = foundWordsRef.current.map(fw =>
          fw.word === normalizedWord && fw.timestamp === now
            ? { ...fw, isValid: false, score: 0 }
            : fw
        );
        setFoundWords(foundWordsRef.current);

        const invalidMsg = t('playerView.invalidWord') || 'Not a valid word';
        setCurrentFeedback({
          id: `reject-${errorNow}`,
          type: 'rejected',
          word: normalizedWord.toUpperCase(),
          message: invalidMsg,
          timestamp: errorNow,
        });
        hapticError();
      });
  }, [
    language,
    minWordLength,
    foundWords,
    gameStartTime,
    getScoreMultiplier,
    fireRoundActive,
    combo,
    spamDetection,
    t,
    playWordAcceptedSound,
    playComboSound,
    announceWordResult,
    announceCombo,
    calculateWordScore,
    onTrainingTrackValidWord,
    onWordFound,
    onWordAccepted,
    isDictionaryCacheLoaded,
    checkWordInCache,
    getPrevalidationCached,
  ]);

  const resetWordSubmission = useCallback(() => {
    setFoundWords([]);
    setScore(0);
    setCurrentFeedback(null);
    foundWordsRef.current = [];
    foundWordsSetRef.current.clear();
    clearPrevalidationCache();
  }, [clearPrevalidationCache]);

  return {
    foundWords,
    score,
    currentFeedback,
    handleWordSubmit,
    foundWordsRef,
    foundWordsSetRef,
    resetWordSubmission,
    prefetchValidation,
  };
}
