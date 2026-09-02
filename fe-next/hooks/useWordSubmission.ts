/**
 * useWordSubmission - Unified word submission and validation hook
 *
 * Used by DailyChallengeGame, SoloPracticeBoard, and any future modes.
 *
 * Features:
 * - Local validation (length, duplicates, board presence)
 * - Client-side dictionary cache for instant validation (IndexedDB + memory)
 * - Pre-validation cache (words validated while user types)
 * - Fallback to dictionary API when cache misses
 * - Optional spam detection
 * - Optimistic combo increment (combo increments at submit, rolls back on reject)
 * - Score calculation via canonical scoring engine
 * - Feedback state management
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { validateWordLocally, isWordOnBoard, buildPositionsMap } from '@/utils/clientWordValidator';
import { getComboBonus, calculateWordScore } from '@/shared/utils/scoring';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { usePrevalidation } from '@/hooks/usePrevalidation';
import { trackWordFound, trackInvalidWord } from '@/utils/posthogEngagement';
import type { Language, LetterGrid } from '@/shared/types/game';

type InvalidWordReason = 'not_in_dictionary' | 'too_short' | 'already_found' | 'invalid_path' | 'other';

/** Maps the hook's i18n errorKey to the PostHog reason taxonomy. */
function errorKeyToReason(errorKey: string | undefined): InvalidWordReason {
  if (!errorKey) return 'other';
  if (errorKey.includes('tooShort') || errorKey.includes('minLength')) return 'too_short';
  if (errorKey.includes('alreadyFound')) return 'already_found';
  if (errorKey.includes('notOnBoard') || errorKey.includes('invalidPath')) return 'invalid_path';
  return 'other';
}

// ==================== Types ====================

export interface WordFeedback {
  id: string;
  type: 'accepted' | 'rejected' | 'duplicate';
  word: string;
  score?: number;
  message?: string;
  fireRoundActive?: boolean;
  fireRoundBonus?: number;
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
  /** Game mode string for analytics (e.g. 'sp', 'daily', 'mp'). Omit to skip tracking. */
  mode?: string;
  /** Fire round active (for 2x multiplier) */
  fireRoundActive?: boolean;
  /** Current combo level for scoring */
  comboLevel?: number;
  /** Translation function */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Called when word is accepted */
  onWordAccepted?: (word: string, score: number, comboBonus: number, fireRoundBonus: number) => void;
  /** Called when word is rejected */
  onWordRejected?: (word: string, reason: string) => void;
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
  calculateScore: (word: string, comboLevel: number) => number;
  /** Prefetch validation for a word being formed (call as user swipes) */
  prefetchValidation: (word: string) => void;
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
    mode,
    fireRoundActive = false,
    comboLevel = 0,
    t = (key: string) => key,
    onWordAccepted,
    onWordRejected,
    onComboReset,
    onComboIncrement,
  } = options;

  // State
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

  // Refs
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  // Seeded in an effect, not in the initializer: Date.now() during render is
  // impure (react-hooks/purity) and drifts across re-renders until the first
  // commit. Its only read is inside submitWord, long after mount.
  const gameStartTimeRef = useRef<number>(0);
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
  }, []);
  const lastWordTimeRef = useRef<number | null>(null);
  const submissionTimestampsRef = useRef<number[]>([]);
  const spamCooldownUntilRef = useRef<number>(0);
  const comboLevelRef = useRef(comboLevel);
  const positionsMapRef = useRef<Map<string, [number, number][]> | null>(null);
  const positionsGridRef = useRef<LetterGrid | null>(null);

  // Keep combo ref in sync
  comboLevelRef.current = comboLevel;

  // Cache positions map — rebuild only when grid changes
  if (grid !== positionsGridRef.current) {
    positionsGridRef.current = grid;
    positionsMapRef.current = grid ? buildPositionsMap(grid, language) : null;
  }

  // Client-side dictionary cache — preloads full dictionary for O(1) lookups
  const { checkWord: checkWordInCache, isLoaded: isDictionaryCacheLoaded } = useDictionaryCache(language);

  // Pre-validation cache — validates words as user swipes, before submit
  const { prefetch: prefetchValidation, getCached: getPrevalidationCached, clearCache: clearPrevalidationCache } = usePrevalidation(language);

  // Calculate valid word count
  const validWordCount = useMemo(() => {
    return foundWords.filter(w => w.isValid === true).length;
  }, [foundWords]);

  /**
   * Calculate word score based on length and combo - matches backend scoring engine
   */
  const calculateScore = useCallback((word: string, currentCombo: number): number => {
    const multiplier = fireRoundActive ? 2 : 1;
    return calculateWordScore(word, currentCombo, multiplier);
  }, [fireRoundActive]);

  /**
   * Check spam detection
   */
  const checkSpam = useCallback((): { blocked: boolean; warning: boolean; message?: string } => {
    if (!enableSpamDetection) return { blocked: false, warning: false };

    const now = Date.now();

    if (spamCooldownUntilRef.current > now) {
      const remaining = Math.ceil((spamCooldownUntilRef.current - now) / 1000);
      return {
        blocked: true,
        warning: false,
        message: t('playerView.slowDown') || `Slow down! Wait ${remaining}s`,
      };
    }

    submissionTimestampsRef.current = submissionTimestampsRef.current.filter(
      ts => now - ts < SPAM_WINDOW_MS
    );
    submissionTimestampsRef.current.push(now);

    const submissionCount = submissionTimestampsRef.current.length;

    if (submissionCount >= SPAM_COOLDOWN_THRESHOLD) {
      spamCooldownUntilRef.current = now + SPAM_COOLDOWN_MS;
      return {
        blocked: true,
        warning: false,
        message: t('playerView.tooFast') || 'Too fast! 3s cooldown',
      };
    }

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
   * Handle a validated word (valid in dictionary)
   */
  const handleValidWord = useCallback((
    normalizedWord: string,
    now: number,
    currentCombo: number,
  ) => {
    const fullScore = calculateScore(normalizedWord, currentCombo);
    const comboBonus = getComboBonus(currentCombo, normalizedWord.length);
    const fireRoundBonus = fireRoundActive
      ? calculateWordScore(normalizedWord, currentCombo, 1)
      : 0;

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
      fireRoundBonus,
      timestamp: now,
    });

    onWordAccepted?.(normalizedWord, fullScore, comboBonus, fireRoundBonus);

    if (mode) {
      const prev = lastWordTimeRef.current;
      const timeSinceLastWordMs = prev != null ? now - prev : undefined;
      lastWordTimeRef.current = now;
      trackWordFound({
        word: normalizedWord,
        mode,
        timeSinceLastWordMs,
        score: fullScore,
      });
    }
  }, [calculateScore, fireRoundActive, onWordAccepted, mode]);

  /**
   * Handle an invalid word (not in dictionary)
   */
  const handleInvalidWord = useCallback((
    normalizedWord: string,
    now: number,
  ) => {
    setFoundWords(prev => prev.map(fw =>
      fw.word === normalizedWord && fw.timestamp === now
        ? { ...fw, isValid: false, score: 0 }
        : fw
    ));
    const msg = t('playerView.invalidWord') || 'Not a valid word';
    setCurrentFeedback({
      id: `reject-${now}`,
      type: 'rejected',
      word: normalizedWord.toUpperCase(),
      message: msg,
      timestamp: now,
    });
    onWordRejected?.(normalizedWord, msg);
    onComboReset?.();

    if (mode) {
      trackInvalidWord({
        mode,
        reason: 'not_in_dictionary',
        attemptLength: normalizedWord.length,
      });
    }
  }, [t, onWordRejected, onComboReset, mode]);

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
      setCurrentFeedback({
        id: `warning-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: spamCheck.message,
        timestamp: now,
      });
    }

    // Step 1: Local validation (uses Set ref for O(1) duplicate check)
    const localValidation = validateWordLocally(
      normalizedWord,
      language,
      minWordLength,
      foundWordsSetRef.current
    );

    if (!localValidation.isValid) {
      const errorKey = localValidation.errorKey ?? 'Invalid word';
      const params = localValidation.errorParams?.min
        ? { min: String(localValidation.errorParams.min) }
        : undefined;
      const msg = params ? t(errorKey, params) : t(errorKey);
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      onWordRejected?.(normalizedWord, msg);
      onComboReset?.();
      if (mode) {
        trackInvalidWord({
          mode,
          reason: errorKeyToReason(localValidation.errorKey),
          attemptLength: normalizedWord.length,
        });
      }
      return;
    }

    // Step 2: Check if word exists on board (uses cached positions map)
    if (!grid || !isWordOnBoard(normalizedWord, grid, language, positionsMapRef.current ?? undefined)) {
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
      if (mode) {
        trackInvalidWord({ mode, reason: 'invalid_path', attemptLength: normalizedWord.length });
      }
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
      if (mode) {
        trackInvalidWord({ mode, reason: 'already_found', attemptLength: normalizedWord.length });
      }
      return;
    }

    // Add to set immediately to prevent double submission
    foundWordsSetRef.current.add(normalizedWord);

    // Optimistically increment combo BEFORE validation.
    // Ensures rapid submissions each get a unique combo level.
    // If the word is invalid, combo resets via onComboReset.
    onComboIncrement?.(true);
    const currentCombo = comboLevelRef.current;
    const baseScore = calculateScore(normalizedWord, 0);
    const timeSinceStart = (now - gameStartTimeRef.current) / 1000;

    // Step 4: Add word with pending state
    setFoundWords(prev => [...prev, {
      word: normalizedWord,
      score: baseScore,
      timestamp: now,
      timeSinceStart,
      isValid: null,
    }]);

    // Step 5a: Try client-side dictionary cache (instant, no network).
    // Only short-circuit on a cache HIT, mirroring the singleplayer hook. A miss
    // used to be a hard reject with no network fallback, which made this hook
    // only as correct as the cache: an empty-but-"loaded" dictionary called every
    // real word invalid, with the player seeing a plain "Not a valid word".
    // A miss now falls through to prevalidation / the API, which is authoritative
    // anyway (it also knows community-approved words the client copy lacks).
    if (isDictionaryCacheLoaded && checkWordInCache(normalizedWord)) {
      handleValidWord(normalizedWord, now, currentCombo);
      return;
    }

    // Step 5b: Try pre-validation cache (validated while user was swiping)
    const prevalidated = getPrevalidationCached(normalizedWord);
    if (prevalidated === true) {
      handleValidWord(normalizedWord, now, currentCombo);
      return;
    } else if (prevalidated === false) {
      handleInvalidWord(normalizedWord, now);
      return;
    }

    // Step 5c: Fallback to dictionary API (network round-trip)
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
          handleValidWord(normalizedWord, now, currentCombo);
        } else {
          handleInvalidWord(normalizedWord, now);
        }
      })
      .catch(() => {
        handleInvalidWord(normalizedWord, now);
      });
  }, [
    grid,
    language,
    minWordLength,
    t,
    checkSpam,
    calculateScore,
    onWordRejected,
    onComboReset,
    onComboIncrement,
    isDictionaryCacheLoaded,
    checkWordInCache,
    getPrevalidationCached,
    handleValidWord,
    handleInvalidWord,
    mode,
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
    lastWordTimeRef.current = null;
    submissionTimestampsRef.current = [];
    spamCooldownUntilRef.current = 0;
    clearPrevalidationCache();
  }, [clearPrevalidationCache]);

  return {
    foundWords,
    currentFeedback,
    foundWordsSet: foundWordsSetRef.current,
    submitWord,
    clearFeedback,
    reset,
    validWordCount,
    calculateScore,
    prefetchValidation,
  };
}

export default useWordSubmission;
