/**
 * useWordSubmission - Unified word submission and validation hook
 *
 * Consolidates word validation logic from:
 * - SinglePlayerGame.tsx (~220 lines)
 * - DailyChallengeGame.tsx (~185 lines)
 * - InGameScreen.tsx (~70 lines for multiplayer)
 *
 * Features:
 * - Local validation (length, duplicates, board presence)
 * - Dictionary API validation
 * - Optional spam detection
 * - Combo integration
 * - Score calculation
 * - Feedback state management
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import type { Language, LetterGrid } from '@/shared/types/game';

// ==================== Types ====================

export interface WordFeedback {
  id: string;
  type: 'accepted' | 'rejected' | 'pending' | 'duplicate';
  word: string;
  score?: number;
  message?: string;
  fireRoundActive?: boolean;
  timestamp: number;
}

export interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart?: number;
  isValid: boolean | null; // null = pending validation
  comboBonus?: number;
  fireRoundBonus?: number;
}

export interface UseWordSubmissionOptions {
  /** Current letter grid */
  grid: LetterGrid | null;
  /** Game language */
  language: Language;
  /** Minimum word length (default: 2) */
  minWordLength?: number;
  /** Enable spam detection (default: false) */
  enableSpamDetection?: boolean;
  /** Fire round active (for 2x multiplier) */
  fireRoundActive?: boolean;
  /** Current combo level for scoring */
  comboLevel?: number;
  /** Translation function */
  t?: (key: string) => string;
  /** Called when word is accepted */
  onWordAccepted?: (word: string, score: number, comboBonus: number, fireRoundBonus: number) => void;
  /** Called when word is rejected */
  onWordRejected?: (word: string, reason: string) => void;
  /** Called when word needs AI validation */
  onWordPending?: (word: string) => void;
  /** Called when combo should reset */
  onComboReset?: () => void;
  /** Called when combo should increment */
  onComboIncrement?: (autoValidated: boolean) => void;
}

export interface WordSubmissionReturn {
  /** List of found words */
  foundWords: FoundWord[];
  /** Current feedback to display */
  currentFeedback: WordFeedback | null;
  /** Set of found word strings for quick lookup */
  foundWordsSet: Set<string>;
  /** Submit a word for validation */
  submitWord: (word: string) => void;
  /** Clear current feedback */
  clearFeedback: () => void;
  /** Reset all state (for new game) */
  reset: () => void;
  /** Get valid word count */
  validWordCount: number;
  /** Calculate word score */
  calculateScore: (wordLength: number, comboLevel: number) => number;
}

// ==================== Constants ====================

const SPAM_WINDOW_MS = 10000; // 10-second window
const SPAM_WARNING_THRESHOLD = 15; // Warn at 15 submissions in 10s
const SPAM_COOLDOWN_THRESHOLD = 25; // Block at 25 submissions in 10s
const SPAM_COOLDOWN_MS = 3000; // 3-second cooldown

// ==================== Hook ====================

export function useWordSubmission(options: UseWordSubmissionOptions): WordSubmissionReturn {
  const {
    grid,
    language,
    minWordLength = 2,
    enableSpamDetection = false,
    fireRoundActive = false,
    comboLevel = 0,
    t = (key: string) => key,
    onWordAccepted,
    onWordRejected,
    onWordPending,
    onComboReset,
    onComboIncrement,
  } = options;

  // State
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

  // Refs
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameStartTimeRef = useRef<number>(Date.now());
  const submissionTimestampsRef = useRef<number[]>([]);
  const spamCooldownUntilRef = useRef<number>(0);
  const comboLevelRef = useRef(comboLevel);

  // Keep combo ref in sync
  comboLevelRef.current = comboLevel;

  // Calculate valid word count
  const validWordCount = useMemo(() => {
    return foundWords.filter(w => w.isValid === true).length;
  }, [foundWords]);

  /**
   * Calculate word score based on length and combo
   */
  const calculateScore = useCallback((wordLength: number, currentCombo: number): number => {
    // Base score: word length - 1 (matches multiplayer scoring)
    const baseScore = Math.max(wordLength - 1, 1);
    // Combo bonus scales with combo level
    const comboBonus = currentCombo > 0 ? Math.floor(baseScore * (currentCombo * 0.1)) : 0;
    // Fire round multiplier (2x during fire round, 1x otherwise)
    const multiplier = fireRoundActive ? 2 : 1;
    return (baseScore + comboBonus) * multiplier;
  }, [fireRoundActive]);

  /**
   * Check spam detection
   * Returns true if submission should be blocked
   */
  const checkSpam = useCallback((): { blocked: boolean; warning: boolean; message?: string } => {
    if (!enableSpamDetection) return { blocked: false, warning: false };

    const now = Date.now();

    // Check if on cooldown
    if (spamCooldownUntilRef.current > now) {
      const remaining = Math.ceil((spamCooldownUntilRef.current - now) / 1000);
      return {
        blocked: true,
        warning: false,
        message: t('playerView.slowDown') || `Slow down! Wait ${remaining}s`,
      };
    }

    // Prune old timestamps and add new one
    submissionTimestampsRef.current = submissionTimestampsRef.current.filter(
      ts => now - ts < SPAM_WINDOW_MS
    );
    submissionTimestampsRef.current.push(now);

    const submissionCount = submissionTimestampsRef.current.length;

    // Check for spam cooldown
    if (submissionCount >= SPAM_COOLDOWN_THRESHOLD) {
      spamCooldownUntilRef.current = now + SPAM_COOLDOWN_MS;
      return {
        blocked: true,
        warning: false,
        message: t('playerView.tooFast') || 'Too fast! 3s cooldown',
      };
    }

    // Warning for approaching limit
    if (submissionCount === SPAM_WARNING_THRESHOLD) {
      return {
        blocked: false,
        warning: true,
        message: t('playerView.submittingTooFast') || 'Submitting too fast!',
      };
    }

    return { blocked: false, warning: false };
  }, [enableSpamDetection, t]);

  /**
   * Submit a word for validation
   */
  const submitWord = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const now = Date.now();

    // Spam detection
    const spamCheck = checkSpam();
    if (spamCheck.blocked) {
      setCurrentFeedback({
        id: `spam-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: spamCheck.message,
        timestamp: now,
      });
      onComboReset?.();
      return;
    }

    if (spamCheck.warning) {
      // Show warning but don't block
      setCurrentFeedback({
        id: `warning-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: spamCheck.message,
        timestamp: now,
      });
    }

    // Step 1: Local validation
    const localValidation = validateWordLocally(
      normalizedWord,
      language,
      minWordLength,
      foundWords.map(fw => ({ word: fw.word, isValid: fw.isValid }))
    );

    if (!localValidation.isValid) {
      let msg = t(localValidation.errorKey ?? 'Invalid word');
      if (localValidation.errorParams?.min) {
        msg = msg.replace('${min}', String(localValidation.errorParams.min));
      }
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      onWordRejected?.(normalizedWord, msg);
      onComboReset?.();
      return;
    }

    // Step 2: Check if word exists on board
    if (!grid || !isWordOnBoard(normalizedWord, grid, language)) {
      const msg = t('playerView.wordNotOnBoard') || 'Word not on board';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      onWordRejected?.(normalizedWord, msg);
      onComboReset?.();
      return;
    }

    // Step 3: Check for duplicates
    if (foundWordsSetRef.current.has(normalizedWord)) {
      const msg = t('playerView.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({
        id: `duplicate-${now}`,
        type: 'duplicate',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      onWordRejected?.(normalizedWord, msg);
      onComboReset?.();
      return;
    }

    // Add to set immediately to prevent double submission
    foundWordsSetRef.current.add(normalizedWord);

    const currentCombo = comboLevelRef.current;
    const baseScore = calculateScore(normalizedWord.length, 0);
    const timeSinceStart = (now - gameStartTimeRef.current) / 1000;

    // Step 4: Add word with pending state
    setFoundWords(prev => [...prev, {
      word: normalizedWord,
      score: baseScore,
      timestamp: now,
      timeSinceStart,
      isValid: null, // Pending validation
    }]);

    // Step 5: Validate with dictionary API
    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language }),
    })
      .then(res => {
        if (!res.ok) {
          return { isValid: false, source: 'pending' };
        }
        return res.json();
      })
      .then(result => {
        if (result.isValid) {
          // Word is valid - calculate full score with combo
          const fullScore = calculateScore(normalizedWord.length, currentCombo);
          const wordLenScore = Math.max(normalizedWord.length - 1, 1);
          const comboBonus = currentCombo > 0 ? Math.floor(wordLenScore * (currentCombo * 0.1)) : 0;
          const fireRoundBonus = fireRoundActive ? (wordLenScore + comboBonus) : 0;

          setFoundWords(prev => prev.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now
              ? { ...fw, isValid: true, score: fullScore, comboBonus, fireRoundBonus }
              : fw
          ));

          setCurrentFeedback({
            id: `accept-${now}`,
            type: 'accepted',
            word: normalizedWord.toUpperCase(),
            score: fullScore,
            fireRoundActive,
            timestamp: now,
          });

          onWordAccepted?.(normalizedWord, fullScore, comboBonus, fireRoundBonus);
          onComboIncrement?.(true);
        } else {
          // Word not in dictionary - stays pending for AI validation
          setCurrentFeedback({
            id: `pending-${now}`,
            type: 'pending',
            word: normalizedWord.toUpperCase(),
            timestamp: now,
          });
          onWordPending?.(normalizedWord);
          onComboReset?.(); // Break combo on pending word
        }
      })
      .catch(() => {
        // On API error, treat as pending
        setCurrentFeedback({
          id: `pending-${Date.now()}`,
          type: 'pending',
          word: normalizedWord.toUpperCase(),
          timestamp: Date.now(),
        });
        onWordPending?.(normalizedWord);
        onComboReset?.();
      });
  }, [
    grid,
    language,
    minWordLength,
    foundWords,
    fireRoundActive,
    t,
    checkSpam,
    calculateScore,
    onWordAccepted,
    onWordRejected,
    onWordPending,
    onComboReset,
    onComboIncrement,
  ]);

  /**
   * Clear current feedback
   */
  const clearFeedback = useCallback(() => {
    setCurrentFeedback(null);
  }, []);

  /**
   * Reset all state for new game
   */
  const reset = useCallback(() => {
    setFoundWords([]);
    setCurrentFeedback(null);
    foundWordsSetRef.current = new Set();
    gameStartTimeRef.current = Date.now();
    submissionTimestampsRef.current = [];
    spamCooldownUntilRef.current = 0;
  }, []);

  return {
    foundWords,
    currentFeedback,
    foundWordsSet: foundWordsSetRef.current,
    submitWord,
    clearFeedback,
    reset,
    validWordCount,
    calculateScore,
  };
}

export default useWordSubmission;
