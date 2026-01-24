'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { getComboBonus as calculateComboBonus } from '@/shared/utils/scoring';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import { recordNotOnBoard, recordNotInDictionary } from '@/utils/invalidWordTracker';
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
  t: (key: string) => string | undefined;
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
  foundWordsRef: React.MutableRefObject<FoundWord[]>;
  /** Ref to found words set for duplicate checking */
  foundWordsSetRef: React.MutableRefObject<Set<string>>;
  /** Reset state for new game */
  resetWordSubmission: () => void;
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
}: UseWordSubmissionOptions): UseWordSubmissionReturn {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

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

  // Calculate word score using shared scoring utilities
  const calculateWordScore = useCallback((wordLength: number, currentComboLevel: number): number => {
    const baseScore = Math.max(wordLength - 1, 1);
    const comboBonus = calculateComboBonus(currentComboLevel, wordLength);
    const multiplier = getScoreMultiplier();
    return (baseScore + comboBonus) * multiplier;
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
      let msg = t(errorKey) || errorKey;
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
    const baseScore = calculateWordScore(normalizedWord.length, 0);
    const fullScore = calculateWordScore(normalizedWord.length, currentCombo);
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

    // Step 5: Check dictionary via backend API
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
          // Word is valid
          const wordLenScore = Math.max(normalizedWord.length - 1, 1);
          const comboBonus = calculateComboBonus(currentCombo, normalizedWord.length);
          const scoreWithoutMultiplier = wordLenScore + comboBonus;
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
        } else {
          // Word NOT in dictionary - stays pending
          combo.resetCombo();
          setCurrentFeedback({
            id: `pending-${now}`,
            type: 'pending',
            word: normalizedWord.toUpperCase(),
            timestamp: now,
          });
          recordNotInDictionary(normalizedWord, language, 'single_player');
        }
      })
      .catch(() => {
        // On API error, treat as pending
        combo.resetCombo();
        setCurrentFeedback({
          id: `pending-${Date.now()}`,
          type: 'pending',
          word: normalizedWord.toUpperCase(),
          timestamp: Date.now(),
        });
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
  ]);

  const resetWordSubmission = useCallback(() => {
    setFoundWords([]);
    setScore(0);
    setCurrentFeedback(null);
    foundWordsRef.current = [];
    foundWordsSetRef.current.clear();
  }, []);

  return {
    foundWords,
    score,
    currentFeedback,
    handleWordSubmit,
    foundWordsRef,
    foundWordsSetRef,
    resetWordSubmission,
  };
}
