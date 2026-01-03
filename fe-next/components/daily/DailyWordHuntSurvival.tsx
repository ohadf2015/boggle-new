'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Store, X, Heart, Coins } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import { useContextualGuidance, useSwipeTipGuidanceTrigger } from '@/hooks/useContextualGuidance';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import type { LetterGrid, Language } from '@/types';
import {
  getLetterFeedback,
  isTargetWordFound,
  type LetterFeedback,
} from '@/utils/wordHuntFeedback';
import {
  generateProgressiveHints,
  calculateLifeReward,
  calculateTokenReward,
  calculateEfficiencyScore,
  CLUE_SHOP_ITEMS,
  type HintLevel,
  type ClueShopItem,
} from '@/utils/aiHintGenerator';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { WordFeedbackToast, type FeedbackType } from './WordFeedbackToast';
import { LifeGainAnimation } from './LifeGainAnimation';
import { useAuth } from '@/contexts/AuthContext';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import { fireConfetti } from '@/utils/confettiUtils';
import { hapticClueRevealed } from '@/utils/haptics';

const MAX_ATTEMPTS = 10;
const INITIAL_LIFE = 100;
const LIFE_DRAIN_RATE = 1.2; // points per second (gives ~83 seconds total)
const INVALID_WORD_PENALTY = 5; // life points lost for invalid submissions
const NOT_IN_DICTIONARY_PENALTY = 4; // life points lost for words not in dictionary

interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  onQuit: () => void;
}

export interface WordDiscovery {
  word: string;
  timestamp: number;
  lifeGained: number;
  tokensGained: number;
}

export interface TargetAttempt {
  word: string;
  feedback: LetterFeedback[];
  timestamp: number;
}

export interface SurvivalGameResult {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attempts: TargetAttempt[];
  wordsDiscovered: WordDiscovery[];
  lifeRemaining: number;
  clueTokensEarned: number;
  clueTokensSpent: number;
  hintsUnlocked: number;
  efficiencyScore: number;
}

/**
 * DailyWordHuntSurvival - Word Hunt with bleeding points, word discovery, and AI hints
 */
const DailyWordHuntSurvival: React.FC<DailyWordHuntSurvivalProps> = ({
  grid,
  puzzleNumber,
  language,
  targetWord,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  // Determine game text direction based on GAME language (not UI language)
  // This ensures clue boxes display in correct order regardless of UI language setting
  const gameDir = language === 'he' ? 'rtl' : 'ltr';
  const { playWordAcceptedSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const isLandscape = useMobileLandscape();
  const { user } = useAuth();

  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipAnimations = useMemo(() => isLowEnd || !enableComplexAnimations, [isLowEnd, enableComplexAnimations]);

  // Screenshot protection - blur sensitive content when tab/window loses focus
  const { isProtected } = useScreenshotProtection();

  // Survival state
  const [lifePoints, setLifePoints] = useState(INITIAL_LIFE);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Word discovery state
  const [discoveredWords, setDiscoveredWords] = useState<WordDiscovery[]>([]);
  const [clueTokens, setClueTokens] = useState(0);

  // Target word attempts
  const [attempts, setAttempts] = useState<TargetAttempt[]>([]);

  // Latest attempt feedback display (for animated hint box overlay)
  const [latestAttemptFeedback, setLatestAttemptFeedback] = useState<LetterFeedback[] | null>(null);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toast feedback system
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Life gain animation
  const [lifeGainAmount, setLifeGainAmount] = useState<number | null>(null);
  const [isLifeGaining, setIsLifeGaining] = useState(false); // Triggers flash/pulse animation on meter

  // Hint system
  const [currentHint, setCurrentHint] = useState<HintLevel | null>(null);
  const [category, setCategory] = useState<string>('');
  const [exampleSentence, setExampleSentence] = useState<string>('');
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [eliminatedLetters, setEliminatedLetters] = useState<Set<string>>(new Set());
  const [knownLetters, setKnownLetters] = useState<Set<string>>(new Set()); // Yellow letters - in word but position unknown
  // Accumulated clues from guesses: position → { letter, type: 'green' | 'yellow' }
  // Green = correct position (permanently revealed), Yellow = wrong position (shows letter but needs repositioning)
  const [accumulatedClues, setAccumulatedClues] = useState<Map<number, { letter: string; type: 'green' | 'yellow' }>>(new Map());
  const [showCategory, setShowCategory] = useState(false);
  const [showExample, setShowExample] = useState(false);

  // UI state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showShopHint, setShowShopHint] = useState(false);
  const shopHintShownRef = useRef(false);
  const [isClueGaining, setIsClueGaining] = useState(false);

  // Refs for life drain and UI elements
  const lifeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverRef = useRef(false);
  const clueContainerRef = useRef<HTMLDivElement>(null);

  // Session tracking
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const gameStartTimeRef = useRef<number>(0);

  // Enable sound effects when game is active, disable when leaving
  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // Refs for callbacks that need to be accessed before declaration
  const handleGameOverRef = useRef<((won: boolean, finalAttempts?: TargetAttempt[]) => void) | null>(null);
  const handleTargetAttemptRef = useRef<((word: string, target: string) => void) | null>(null);
  const handleWordDiscoveryRef = useRef<((word: string) => void) | null>(null);

  // Contextual guidance - helps new players learn to swipe to form words
  const contextualGuidance = useContextualGuidance();

  // Swipe tip guidance - shows after 15 seconds if player hasn't discovered any words
  // This helps new players understand they need to swipe on the grid to find words and gain life
  const isGameActive = !isGameOver && lifePoints > 0;
  useSwipeTipGuidanceTrigger(
    discoveredWords.length,
    contextualGuidance.triggerSwipeTipGuidance,
    isGameActive,
    15 // 15 seconds delay
  );

  // Load AI hints on mount
  useEffect(() => {
    // Guard against undefined/empty targetWord
    if (!targetWord || targetWord.length < 2) {
      return;
    }

    async function loadHints() {
      const hints = await generateProgressiveHints(targetWord, language);
      setCategory(hints.category);
      setExampleSentence(hints.exampleSentence);

      // Show first hint immediately (hints no longer progress based on word discovery)
      if (hints.hints.length > 0) {
        setCurrentHint(hints.hints[0]);
      }
    }
    loadHints();
  }, [targetWord, language]);

  // Initialize game start time on mount (separate from Date.now in render for React Compiler)
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
  }, []);

  // Log game session start
  useEffect(() => {
    async function initGameSession() {
      const sessionId = await logGameStart({
        mode: 'daily_challenge',
        language,
        userId: user?.id || null,
        dailyPuzzleNumber: puzzleNumber,
        targetWord,
      });
      if (sessionId) {
        setGameSessionId(sessionId);
      }
    }
    initGameSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Start fire round music on mount
  useEffect(() => {
    // Fade to fire round music (bossa arcade) with quick fade
    fadeToTrack(TRACKS.BOSSA_ARCADE, 500, 800);

    // Cleanup: stop music when component unmounts
    return () => {
      // Music transition will be handled by parent component
    };
  }, [fadeToTrack, TRACKS]);

  // Start life drain
  useEffect(() => {
    if (isGameOver) {
      if (lifeIntervalRef.current) {
        clearInterval(lifeIntervalRef.current);
      }
      return;
    }

    lifeIntervalRef.current = setInterval(() => {
      setLifePoints(prev => {
        const newLife = Math.max(0, prev - LIFE_DRAIN_RATE);
        if (newLife === 0 && !gameOverRef.current) {
          handleGameOverRef.current?.(false); // Died - use ref to avoid declaration order issues
        }
        return newLife;
      });
    }, 1000);

    return () => {
      if (lifeIntervalRef.current) {
        clearInterval(lifeIntervalRef.current);
      }
    };
  }, [isGameOver]);

  // Show shop hint when life is at half and tokens are available (non-intrusive suggestion)
  useEffect(() => {
    const HALF_LIFE_THRESHOLD = 50; // Show hint when life drops to half (50%)
    const MIN_TOKENS_FOR_HINT = 60; // Minimum cost of cheapest item

    if (
      !shopHintShownRef.current &&
      !isGameOver &&
      lifePoints <= HALF_LIFE_THRESHOLD &&
      clueTokens >= MIN_TOKENS_FOR_HINT
    ) {
      shopHintShownRef.current = true;
      setShowShopHint(true);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setShowShopHint(false), 5000);
    }
  }, [lifePoints, clueTokens, isGameOver]);

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);


  // Validate word against dictionary API
  const validateWordInDictionary = useCallback(async (word: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/dictionary/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.toLowerCase(), language }),
      });
      const data = await response.json();
      // Valid if source is dictionary, community, or community_positive
      return data.isValid === true;
    } catch (error) {
      console.error('Dictionary validation error:', error);
      // On error, allow the word (fail open for better UX)
      return true;
    }
  }, [language]);

  // Show toast feedback
  const showToast = useCallback((type: FeedbackType, message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
  }, []);

  // Close toast
  const closeToast = useCallback(() => {
    setFeedbackType(null);
    setFeedbackMessage('');
  }, []);

  // Handle word change from grid
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
    // Don't close toast here - let it display for full duration even while forming next word
  }, []);

  // Handle word submission (could be target attempt OR grid word discovery)
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();

    // Check if attempting target word (exact match only)
    if (normalizedWord === normalizedTarget) {
      handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
    } else if (normalizedWord.length === normalizedTarget.length) {
      // Same length as target - could be a target guess attempt
      // First check if it's already been attempted
      if (attempts.some(a => a.word === normalizedWord)) {
        showToast('duplicate', t('wordHunt.alreadyGuessed') || '🔁 Already guessed!');
        return;
      }
      // Check if it's a valid word on the board - if so, treat as word discovery AND target attempt
      if (isWordOnBoard(normalizedWord, grid, language)) {
        // It's a valid word, give discovery rewards AND record as target attempt
        handleWordDiscoveryRef.current?.(normalizedWord);
        handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
      } else {
        // Not a valid word path on board - penalize and record as target attempt
        setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));
        showToast('not-on-board', t('wordHunt.feedback.notFormablePenalty') || `⚠️ Not on board -${INVALID_WORD_PENALTY} ❤️`);
        handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
      }
    } else {
      // Different length - it's only a grid word discovery
      handleWordDiscoveryRef.current?.(normalizedWord);
    }
  }, [isGameOver, targetWord, attempts, grid, language, showToast, t]);

  // Handle target word attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    // Check if already attempted
    if (attempts.some(a => a.word === word)) {
      showToast('duplicate', t('wordHunt.alreadyGuessed') || '🔁 Already guessed!');
      return;
    }

    // Get feedback
    const feedback = getLetterFeedback(word, target);
    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    playWordAcceptedSound?.();

    // Accumulate clue information from this guess
    // Green letters = correct position (permanently revealed)
    // Yellow letters = in word but wrong position (shown but marked yellow)
    // Green always takes priority over yellow at same position
    // IMPORTANT: Only track yellow for a letter if target has more instances than we've found green
    // (handles case where same letter appears multiple times in target word)

    // Count letter occurrences in target word (for handling duplicates like "ARENA")
    const targetLetterCounts = new Map<string, number>();
    target.split('').forEach(letter => {
      const upper = letter.toUpperCase();
      targetLetterCounts.set(upper, (targetLetterCounts.get(upper) || 0) + 1);
    });

    setAccumulatedClues(prev => {
      const updated = new Map(prev);

      // First pass: add all GREEN letters (these always win)
      feedback.forEach((fb) => {
        if (fb.feedback === 'green') {
          updated.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
        }
      });

      // Count how many of each letter are GREEN in accumulated clues (after adding new greens)
      const greenLetterCounts = new Map<string, number>();
      updated.forEach((clue) => {
        if (clue.type === 'green') {
          greenLetterCounts.set(clue.letter, (greenLetterCounts.get(clue.letter) || 0) + 1);
        }
      });

      // Second pass: add YELLOW letters only if:
      // 1. No green at this position already
      // 2. Target has more of this letter than we've found green (handles duplicates)
      feedback.forEach((fb) => {
        if (fb.feedback === 'yellow') {
          const upperLetter = fb.letter.toUpperCase();
          const existing = updated.get(fb.position);
          const targetCount = targetLetterCounts.get(upperLetter) || 0;
          const greenCount = greenLetterCounts.get(upperLetter) || 0;

          // Only add yellow if no green at this position AND target has more of this letter than we've found
          if ((!existing || existing.type !== 'green') && targetCount > greenCount) {
            updated.set(fb.position, { letter: upperLetter, type: 'yellow' });
          }
        }
      });

      // Clean up: remove any existing yellow entries for letters now fully accounted for by greens
      // This handles the case where a letter was yellow before but is now green elsewhere
      updated.forEach((clue, position) => {
        if (clue.type === 'yellow') {
          const targetCount = targetLetterCounts.get(clue.letter) || 0;
          const greenCount = greenLetterCounts.get(clue.letter) || 0;
          if (greenCount >= targetCount) {
            updated.delete(position);
          }
        }
      });

      return updated;
    });

    // Update knownLetters for the "Contains:" display
    // Only show letters as "known" if target has more instances than we've found green
    // IMPORTANT: Count ALL greens from ALL attempts, not just current feedback
    setKnownLetters(prev => {
      const updated = new Set(prev);

      // Count ALL green letters from ALL attempts (including current one)
      const allGreenCounts = new Map<string, number>();
      newAttempts.forEach((attempt) => {
        attempt.feedback.forEach((fb) => {
          if (fb.feedback === 'green') {
            const upper = fb.letter.toUpperCase();
            allGreenCounts.set(upper, (allGreenCounts.get(upper) || 0) + 1);
          }
        });
      });

      // Add yellow letters only if target has more instances than all greens found
      feedback.forEach((fb) => {
        if (fb.feedback === 'yellow') {
          const upperLetter = fb.letter.toUpperCase();
          const targetCount = targetLetterCounts.get(upperLetter) || 0;
          const greenCount = allGreenCounts.get(upperLetter) || 0;

          // Only add to known letters if target has more than all found greens
          if (targetCount > greenCount) {
            updated.add(upperLetter);
          }
        }
      });

      // Remove letters from knownLetters if they have ANY green position
      // Once a letter is green, the player knows it's in the word - no need to show in "wrong spot" hints
      allGreenCounts.forEach((greenCount, letter) => {
        if (greenCount > 0) {
          updated.delete(letter);
        }
      });

      return updated;
    });

    // Show letter feedback overlay on hint boxes
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setLatestAttemptFeedback(feedback);
    setShowFeedbackOverlay(true);

    // Hide feedback overlay after 3 seconds (return to hint display)
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedbackOverlay(false);
    }, 3000);

    // Check if correct
    const won = isTargetWordFound(feedback);
    if (won) {
      // Keep feedback visible on victory
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      handleGameOverRef.current?.(true, newAttempts); // Victory - pass the updated attempts array
      return;
    }

    // Wrong guess - penalize with life loss
    setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));

    // Check if out of attempts
    if (newAttempts.length >= MAX_ATTEMPTS) {
      // Keep feedback visible on game over
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      handleGameOverRef.current?.(false, newAttempts); // Failed - pass the updated attempts array
      return;
    }

    // Feedback shown via colored letter boxes overlay
  }, [attempts, playWordAcceptedSound, t, showToast]);

  // Handle grid word discovery
  const handleWordDiscovery = useCallback(async (word: string) => {
    // Check minimum length (2+ letters - Japanese uses 2-character kanji compounds)
    if (word.length < 2) {
      showToast('too-short', t('wordHunt.feedback.tooShort') || '📏 Minimum 2 letters');
      return;
    }

    // Check if already discovered
    if (discoveredWords.some(w => w.word === word)) {
      showToast('duplicate', t('wordHunt.feedback.duplicate') || '🔁 Already found!');
      return;
    }

    // Check if word is actually on the board
    if (!isWordOnBoard(word, grid, language)) {
      // Penalize for invalid word submission
      setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));
      showToast('not-on-board', t('wordHunt.feedback.notOnBoardPenalty') || `⚠️ Not on board -${INVALID_WORD_PENALTY} ❤️`);
      return;
    }

    // Validate word against dictionary - only valid dictionary words give rewards
    const isValidWord = await validateWordInDictionary(word);
    if (!isValidWord) {
      // Word is on board but not in dictionary - penalize
      setLifePoints(prev => Math.max(0, prev - NOT_IN_DICTIONARY_PENALTY));
      showToast('not-in-dictionary', t('wordHunt.feedback.notInDictionary') || `📖 Not a word -${NOT_IN_DICTIONARY_PENALTY} ❤️`);
      return;
    }

    // Calculate rewards
    const lifeGained = calculateLifeReward(word.length);
    const tokensGained = calculateTokenReward(word.length);

    // Add to discovered words
    const discovery: WordDiscovery = {
      word,
      lifeGained,
      tokensGained,
      timestamp: Date.now(),
    };

    setDiscoveredWords(prev => [...prev, discovery]);
    setLifePoints(prev => Math.min(INITIAL_LIFE, prev + lifeGained));
    setClueTokens(prev => prev + tokensGained);
    playWordAcceptedSound?.();

    // ENHANCED: Reveal letter clues from discovered words (longer words can reveal positional clues)
    // If the word is >= target length, check for positional matches (GREEN clues)
    // Also check for letters that exist in target (YELLOW clues / knownLetters)
    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();
    const targetLength = normalizedTarget.length;

    // Count letters in target for yellow tracking (handles duplicates)
    const targetLetterCounts = new Map<string, number>();
    normalizedTarget.split('').forEach(letter => {
      targetLetterCounts.set(letter, (targetLetterCounts.get(letter) || 0) + 1);
    });

    let cluesRevealed = 0;

    // Pre-compute new green positions from this discovered word
    // This is needed to properly update knownLetters without stale state issues
    const checkLength = Math.min(normalizedWord.length, targetLength);
    const newGreenPositions = new Map<number, string>(); // position → letter
    for (let pos = 0; pos < checkLength; pos++) {
      const wordLetter = normalizedWord[pos];
      const targetLetter = normalizedTarget[pos];
      if (wordLetter === targetLetter) {
        newGreenPositions.set(pos, wordLetter);
      }
    }

    // Check for GREEN and YELLOW clues from discovered words
    // SIMPLIFIED: Any 3+ letter word can reveal clues at positions within target word range
    // This is incremental - only adds new clues, never removes existing ones
    if (normalizedWord.length >= 3) {
      setAccumulatedClues(prev => {
        const updated = new Map(prev);
        let newGreens = 0;
        let newYellows = 0;

        // Count how many of each letter are already GREEN in accumulated clues
        const greenLetterCounts = new Map<string, number>();
        updated.forEach((clue) => {
          if (clue.type === 'green') {
            greenLetterCounts.set(clue.letter, (greenLetterCounts.get(clue.letter) || 0) + 1);
          }
        });

        // First pass: Check positions within target range for GREEN clues (exact matches)
        for (let pos = 0; pos < checkLength; pos++) {
          const wordLetter = normalizedWord[pos];
          const targetLetter = normalizedTarget[pos];

          // If the discovered word has a letter at this position that matches target
          if (wordLetter === targetLetter) {
            // Only add if not already green at this position (incremental)
            const existing = updated.get(pos);
            if (!existing || existing.type !== 'green') {
              updated.set(pos, { letter: wordLetter, type: 'green' });
              newGreens++;
              // Update green count
              greenLetterCounts.set(wordLetter, (greenLetterCounts.get(wordLetter) || 0) + 1);
            }
          }
        }

        // Second pass: Check for YELLOW clues (letters in wrong position)
        // Only add yellow if:
        // 1. Letter exists in target but not at this position
        // 2. No green already at this position
        // 3. Target has more instances of this letter than we've found green
        for (let pos = 0; pos < checkLength; pos++) {
          const wordLetter = normalizedWord[pos];
          const targetLetter = normalizedTarget[pos];
          const existing = updated.get(pos);

          // Skip if already green at this position or if it's a correct position match
          if (wordLetter === targetLetter || existing?.type === 'green') {
            continue;
          }

          // Check if letter exists in target word
          const targetCount = targetLetterCounts.get(wordLetter) || 0;
          const greenCount = greenLetterCounts.get(wordLetter) || 0;

          // Only add yellow if target has this letter and has more instances than greens
          if (targetCount > 0 && targetCount > greenCount) {
            // Only add if no clue exists at this position, or if existing is yellow (keep yellow)
            if (!existing || existing.type === 'yellow') {
              updated.set(pos, { letter: wordLetter, type: 'yellow' });
              if (!existing) {
                newYellows++;
              }
            }
          }
        }

        cluesRevealed += newGreens + newYellows;
        return updated;
      });
    }

    // Check for YELLOW clues (letters exist in target but at different positions)
    // Add to knownLetters for the "Contains:" display
    // SIMPLIFIED: Also requires 3+ letter words for consistency
    // IMPORTANT: Don't add letters that are already fully revealed as green
    if (normalizedWord.length >= 3) {
      setKnownLetters(prev => {
        const updated = new Set(prev);
        const usedCounts = new Map<string, number>();

        // Count existing GREEN letters from accumulatedClues PLUS new greens from this word
        // This fixes the stale state issue where accumulatedClues hasn't been updated yet
        const greenLetterCounts = new Map<string, number>();
        accumulatedClues.forEach((clue) => {
          if (clue.type === 'green') {
            greenLetterCounts.set(clue.letter, (greenLetterCounts.get(clue.letter) || 0) + 1);
          }
        });
        // Add new greens from this discovered word (computed before state updates)
        newGreenPositions.forEach((letter, pos) => {
          // Only count if not already green at this position
          const existingClue = accumulatedClues.get(pos);
          if (!existingClue || existingClue.type !== 'green') {
            greenLetterCounts.set(letter, (greenLetterCounts.get(letter) || 0) + 1);
          }
        });

        // Check letters and add to known letters if they exist in target (incremental)
        // But ONLY if target has more instances than we've already found as green
        for (const letter of normalizedWord) {
          const targetCount = targetLetterCounts.get(letter) || 0;
          const greenCount = greenLetterCounts.get(letter) || 0;

          // Only add if letter exists in target AND target has more instances than greens found
          if (targetCount > 0 && targetCount > greenCount) {
            const used = usedCounts.get(letter) || 0;
            if (used < targetCount - greenCount) {
              usedCounts.set(letter, used + 1);
              // Add to known letters
              updated.add(letter);
            }
          }
        }

        // Clean up: remove any letters that have full green coverage
        // This handles cases where greens were found in previous guesses
        greenLetterCounts.forEach((greenCount, letter) => {
          const targetCount = targetLetterCounts.get(letter) || 0;
          if (greenCount >= targetCount) {
            updated.delete(letter);
          }
        });

        return updated;
      });
    }

    // Trigger life gain animation
    setLifeGainAmount(lifeGained);
    setIsLifeGaining(true);
    // Reset animation trigger after animation completes
    setTimeout(() => setIsLifeGaining(false), 600);

    // Trigger clue gain animation (green glow + confetti + haptic on clue container)
    if (cluesRevealed > 0) {
      setIsClueGaining(true);
      setTimeout(() => setIsClueGaining(false), 800);

      // Haptic feedback for clue reveal
      hapticClueRevealed(cluesRevealed);

      // Fire small confetti burst from clue container
      if (clueContainerRef.current && typeof window !== 'undefined') {
        const rect = clueContainerRef.current.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;
        fireConfetti({
          particleCount: 12 + cluesRevealed * 4, // More confetti for more clues
          spread: 45,
          startVelocity: 20,
          gravity: 0.8,
          ticks: 80,
          origin: { x: originX, y: originY },
          colors: ['#22c55e', '#4ade80', '#86efac', '#fde047'], // Green + yellow accent
          scalar: 0.7,
        });
      }
    }

    // Show success feedback with clue bonus if applicable
    const clueBonus = cluesRevealed > 0 ? ` 💡+${cluesRevealed}` : '';
    showToast('valid-word', `+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}${clueBonus}`);
  }, [accumulatedClues, discoveredWords, grid, language, playWordAcceptedSound, showToast, t, targetWord, validateWordInDictionary]);

  // Handle game over
  const handleGameOver = useCallback(async (won: boolean, finalAttempts?: TargetAttempt[]) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setIsGameOver(true);
    setHasWon(won);

    // Transition to calmer music for results
    fadeToTrack(TRACKS.BOSSA, 1000, 1500);

    if (lifeIntervalRef.current) {
      clearInterval(lifeIntervalRef.current);
    }

    // Use provided finalAttempts or fall back to state (for life drain game over)
    const attemptsToUse = finalAttempts || attempts;

    const result: SurvivalGameResult = {
      solved: won,
      attemptsUsed: attemptsToUse.length,
      targetWord,
      attempts: attemptsToUse,
      wordsDiscovered: discoveredWords,
      lifeRemaining: lifePoints,
      clueTokensEarned: clueTokens + tokensSpent,
      clueTokensSpent: tokensSpent,
      hintsUnlocked: currentHint?.level || 0,
      efficiencyScore: calculateEfficiencyScore(
        lifePoints,
        clueTokens,
        attemptsToUse.length,
        discoveredWords.length,
        won
      ),
    };

    // Log game session end
    if (gameSessionId) {
      const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      const wordsFoundFormatted = formatWordsForLogging(
        discoveredWords.map(w => w.word),
        discoveredWords.map(w => ({
          word: w.word,
          points: w.lifeGained + (w.tokensGained * 10), // Approximate points
          timestamp: w.timestamp,
        }))
      );

      await logGameEnd(gameSessionId, {
        score: result.efficiencyScore,
        wordsFound: wordsFoundFormatted,
        durationSeconds,
        completed: true,
        targetFound: won,
        attemptsUsed: attemptsToUse.length,
        lifeRemaining: lifePoints,
        lifeGained: discoveredWords.reduce((sum, w) => sum + w.lifeGained, 0),
        tokensEarned: clueTokens + tokensSpent,
        tokensSpent: tokensSpent,
        cluesUsed: tokensSpent > 0 ? Math.ceil(tokensSpent / 5) : 0, // Estimate clues used
      });
    }

    onComplete(result);
  }, [attempts, discoveredWords, lifePoints, clueTokens, tokensSpent, currentHint, targetWord, onComplete, gameSessionId, gameStartTimeRef, fadeToTrack, TRACKS]);

  // Keep callback refs in sync
  useEffect(() => {
    handleGameOverRef.current = handleGameOver;
  }, [handleGameOver]);

  useEffect(() => {
    handleTargetAttemptRef.current = handleTargetAttempt;
  }, [handleTargetAttempt]);

  useEffect(() => {
    handleWordDiscoveryRef.current = handleWordDiscovery;
  }, [handleWordDiscovery]);

  // Handle clue shop purchases
  const handlePurchase = useCallback((item: ClueShopItem) => {
    if (clueTokens < item.cost) {
      showToast('invalid-word', t('wordHunt.survival.notEnoughTokens') || 'Not enough tokens!');
      return;
    }

    setClueTokens(prev => prev - item.cost);
    setTokensSpent(prev => prev + item.cost);
    setShowShop(false);

    switch (item.id) {
      case 'reveal_letter': {
        // Reveal a random unrevealed letter, but never reveal ALL letters (keep at least 1 hidden)
        const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
        // Only reveal if we have at least 2 unrevealed letters (to keep 1 always hidden)
        if (unrevealed.length > 1) {
          const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          setRevealedLetters(prev => new Set([...prev, randomIdx]));
        } else {
          // Cannot reveal more - refund and show feedback
          setClueTokens(prev => prev + item.cost);
          setTokensSpent(prev => prev - item.cost);
          showToast('invalid-word', t('wordHunt.survival.cannotRevealMore') || 'Cannot reveal more letters');
        }
        break;
      }
      case 'eliminate_letters': {
        // Eliminate 3 random wrong letters
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const targetLetters = new Set(targetWord.toUpperCase().split(''));
        const wrongLetters = alphabet.split('').filter(l => !targetLetters.has(l) && !eliminatedLetters.has(l));
        const toEliminate = wrongLetters.slice(0, 3);
        setEliminatedLetters(prev => new Set([...prev, ...toEliminate]));
        break;
      }
      case 'example_sentence':
        setShowExample(true);
        break;
      case 'reveal_category':
        setShowCategory(true);
        break;
    }

    playWordAcceptedSound?.();
  }, [clueTokens, targetWord, revealedLetters, eliminatedLetters, playWordAcceptedSound, showToast, t]);

  // Render target word with revealed letters - responsive sizing
  const renderTargetWord = () => {
    // Dynamically size based on word length to fit screen
    const wordLength = targetWord.length;
    // Larger boxes for short words, smaller for long words
    const sizeClass = wordLength <= 4
      ? "w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl"
      : wordLength <= 6
        ? "w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl"
        : wordLength <= 8
          ? "w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg"
          : "w-7 h-7 sm:w-9 sm:h-9 text-sm sm:text-base";

    return targetWord.split('').map((letter, idx) => (
      <motion.div
        key={idx}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: idx * 0.05, type: "spring", stiffness: 300 }}
        className={cn(
          "flex items-center justify-center border-2 border-neo-black rounded-lg bg-white dark:bg-gray-800 font-bold shadow-sm",
          sizeClass,
          revealedLetters.has(idx) && "bg-neo-yellow/30 border-neo-yellow"
        )}
      >
        {revealedLetters.has(idx) ? letter.toUpperCase() : '_'}
      </motion.div>
    ));
  };

  // Life bar color based on remaining life
  const getLifeColor = () => {
    if (lifePoints > 66) return 'bg-green-500';
    if (lifePoints > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // ==================== Landscape Layout ====================
  // In landscape mobile mode, use a 3-column layout with grid centered
  if (isLandscape) {
    return (
      <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-slate-900 text-white">
        {/* Toast feedback */}
        <WordFeedbackToast
          type={feedbackType}
          message={feedbackMessage}
          onClose={closeToast}
        />

        {/* Swipe tip guidance for new players */}
        <SwipeTipTooltip
          isVisible={contextualGuidance.showSwipeTip}
          onDismiss={contextualGuidance.dismissSwipeTip}
          t={t}
        />

        {/* Left Side Panel - Life & Tries */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 landscape-side-panel">
          <div className="landscape-panel flex flex-col items-center gap-4">
            {/* Life Heart Icon */}
            <motion.div
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-full border-3 border-neo-black shadow-hard",
                lifePoints > 66 ? "bg-green-500" : lifePoints > 33 ? "bg-yellow-500" : "bg-red-500",
                isLifeGaining && "heart-beating"
              )}
              animate={
                lifePoints <= 20 && !isGameOver && !isLifeGaining
                  ? { scale: [1, 1.15, 1] }
                  : {}
              }
              transition={{ duration: 0.6, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
            >
              <Heart className="w-7 h-7 text-white fill-white" />
            </motion.div>

            {/* Life Points */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "landscape-stat-secondary",
                lifePoints > 66 ? "text-green-600" : lifePoints > 33 ? "text-yellow-600" : "text-red-600"
              )}>
                {Math.floor(lifePoints)}%
              </div>
              <div className="landscape-stat-label text-neo-black">LIFE</div>
            </div>

            {/* Tries Remaining */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "landscape-stat-secondary text-neo-black",
                MAX_ATTEMPTS - attempts.length <= 2 && "text-red-600"
              )}>
                {MAX_ATTEMPTS - attempts.length}
              </div>
              <div className="landscape-stat-label text-neo-black">
                {t('wordHunt.survival.triesLeft') || 'TRIES'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel - Tokens & Shop */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 landscape-side-panel">
          <div className="landscape-panel flex flex-col items-center gap-4">
            {/* Clue Tokens */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Coins className={cn("w-6 h-6", isClueGaining && "animate-bounce text-yellow-500")} style={{ color: '#ca8a04' }} />
                <span className="landscape-stat-secondary text-neo-black">{clueTokens}</span>
              </div>
              <div className="landscape-stat-label text-neo-black">TOKENS</div>
            </div>

            {/* Shop Button */}
            <Button
              size="sm"
              onClick={() => {
                setShowShop(!showShop);
                setShowShopHint(false);
              }}
              className={cn(
                "w-14 h-14 p-0 bg-neo-purple text-white border-3 border-neo-black rounded-neo shadow-hard hover:bg-neo-purple/80",
                showShopHint && "animate-pulse ring-2 ring-neo-yellow ring-offset-1"
              )}
            >
              <Store className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Bottom-left: Quit button */}
        <div className="absolute bottom-2 left-2 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuitConfirm(true)}
            className="w-12 h-12 p-0 bg-neo-red hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
          >
            <X className="text-lg text-neo-cream" />
          </Button>
        </div>

        {/* Center: Target Word + Grid - with horizontal padding for side panels */}
        <div className="flex flex-col items-center justify-center w-full h-full px-[150px] py-2 gap-2 landscape-grid-container">
          {/* Target word hint boxes - compact for landscape */}
          {currentHint && (
            <div
              dir={gameDir}
              className={cn(
                "flex justify-center flex-wrap gap-1.5 mb-2 p-2 rounded-neo bg-neo-navy/30 border-2 border-neo-black/20",
                isProtected && "blur-xl select-none"
              )}
            >
              {(() => {
                const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
                const wordLength = hintChars.length;
                const sizeClass = wordLength <= 4
                  ? "w-9 h-9 text-base"
                  : wordLength <= 6
                    ? "w-8 h-8 text-sm"
                    : "w-7 h-7 text-xs";

                return hintChars.map((char, idx) => {
                  const accumulatedClue = accumulatedClues.get(idx);
                  const isHintRevealed = char !== '_';
                  const isShopRevealed = revealedLetters.has(idx);

                  let displayChar: string;
                  let bgClass: string;

                  if (accumulatedClue) {
                    displayChar = accumulatedClue.letter;
                    bgClass = accumulatedClue.type === 'green'
                      ? "bg-green-500 border-green-700 text-white"
                      : "bg-yellow-500 border-yellow-600 text-neo-black";
                  } else if (isShopRevealed) {
                    displayChar = targetWord[idx]?.toUpperCase() || '?';
                    bgClass = "bg-green-500 border-green-700 text-white";
                  } else if (isHintRevealed) {
                    displayChar = char.toUpperCase();
                    bgClass = "bg-neo-purple border-neo-purple text-white";
                  } else {
                    displayChar = '';
                    bgClass = "bg-neo-black border-neo-black";
                  }

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard-sm",
                        sizeClass,
                        bgClass
                      )}
                    >
                      {displayChar}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Grid - centered */}
          <div className="flex-1 flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
            <div className={cn(
              "transition-all duration-200",
              isProtected && "blur-xl pointer-events-none select-none"
            )}>
              <GridComponent
                grid={grid}
                interactive={!isGameOver && !isProtected}
                onWordSubmit={handleWordSubmit}
                onWordChange={handleWordChange}
                hideWordPreview
                hideComboIndicator
                comboLevel={0}
                eliminatedLetters={eliminatedLetters}
              />
            </div>
          </div>
        </div>

        {/* Clue Shop Modal */}
        <AnimatePresence>
          {showShop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowShop(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-4 max-w-sm w-full"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-black mb-3">{t('wordHunt.survival.shop') || 'Clue Shop'}</h3>
                <div className="space-y-2">
                  {CLUE_SHOP_ITEMS.map((item) => {
                    const itemNames: Record<string, string> = {
                      'reveal_letter': t('wordHunt.survival.revealLetter') || 'Reveal Letter',
                      'eliminate_letters': t('wordHunt.survival.eliminateLetters') || 'Eliminate Wrong Letters',
                      'example_sentence': t('wordHunt.survival.exampleSentence') || 'Example Sentence',
                      'reveal_category': t('wordHunt.survival.revealCategory') || 'Reveal Category',
                    };
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePurchase(item)}
                        disabled={clueTokens < item.cost}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-neo border-2 transition-all text-left",
                          clueTokens >= item.cost
                            ? "bg-neo-yellow hover:shadow-hard border-neo-black"
                            : "border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.icon}</span>
                          <span className="font-bold text-sm">{itemNames[item.id] || item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          {item.cost}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => setShowShop(false)}
                  className="w-full mt-3"
                >
                  {t('common.close') || 'Close'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quit Confirmation Dialog */}
        <ConfirmationDialog
          open={showQuitConfirm}
          onOpenChange={setShowQuitConfirm}
          onConfirm={onQuit}
          title={t('wordHunt.quitConfirmTitle') || 'Quit Game?'}
          description={t('wordHunt.quitConfirmMessage') || 'You will lose your current progress.'}
          confirmText={t('common.quit') || 'Quit'}
          cancelText={t('common.cancel') || 'Cancel'}
          variant="danger"
        />
      </div>
    );
  }

  // ==================== Portrait Layout ====================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-1 px-2 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowQuitConfirm(true)}
          className="text-gray-600 hover:text-red-500"
        >
          <X className="w-4 h-4 mr-1" />
          {t('common.quit') || 'Quit'}
        </Button>

        {/* Coins + Shop in corner */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="font-bold text-sm">{clueTokens}</span>
          </div>
          <div className="relative">
            <Button
              size="sm"
              onClick={() => {
                setShowShop(!showShop);
                setShowShopHint(false);
              }}
              className={cn(
                "bg-neo-purple text-white relative hover:bg-neo-purple/80",
                showShopHint && "animate-pulse ring-2 ring-neo-yellow ring-offset-1"
              )}
            >
              <Store className="w-4 h-4" />
              {clueTokens > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-yellow text-neo-black text-xs font-bold rounded-full flex items-center justify-center border border-neo-black">
                  !
                </span>
              )}
            </Button>

            {/* Non-intrusive hint tooltip */}
            <AnimatePresence>
              {showShopHint && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 z-50"
                >
                  <div className="bg-neo-yellow text-neo-black text-xs font-bold px-3 py-1.5 rounded-neo border-2 border-neo-black whitespace-nowrap shadow-hard-sm">
                    <Coins className="w-3 h-3 inline mr-1" />
                    {t('wordHunt.survival.spendCoinsHint') || 'Spend coins on clues!'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Target word black boxes - always visible, with screenshot protection */}
      {currentHint && (
        <motion.div
          ref={clueContainerRef}
          // Key on attempts length to retrigger attention animation on each guess
          key={`clue-container-${attempts.length}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mx-auto max-w-3xl w-full px-3 py-3 mb-1 rounded-neo-lg transition-all duration-300",
            "bg-neo-navy/30 dark:bg-neo-navy/50 border-2 border-neo-black/20",
            showFeedbackOverlay
              ? "clue-feedback-active clue-container-attention"
              : isClueGaining
                ? "clue-container-green-glow" // Green glow when revealing clues
                : "clue-container-glow", // Subtle continuous glow when idle
            // Screenshot protection blur
            isProtected && "blur-xl select-none"
          )}
        >
          {/* Tries counter - big and prominent */}
          <div className="text-center mb-2">
            <span className={cn(
              "text-xl sm:text-2xl font-black",
              MAX_ATTEMPTS - attempts.length <= 2
                ? "text-red-600 dark:text-red-400"
                : MAX_ATTEMPTS - attempts.length <= 4
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-gray-700 dark:text-gray-300"
            )}>
              {MAX_ATTEMPTS - attempts.length}/{MAX_ATTEMPTS} {t('wordHunt.survival.triesLeft') || 'tries left'}
            </span>
          </div>

          {/* Black boxes for target word OR Letter Feedback Overlay */}
          {/* Use explicit dir based on GAME language to ensure correct letter ordering */}
          <div dir={gameDir} className="flex justify-center flex-wrap gap-2 sm:gap-2.5 px-2">
            <AnimatePresence mode="wait">
              {showFeedbackOverlay && latestAttemptFeedback ? (
                // Show colored letter feedback when overlay is active
                <motion.div
                  key="feedback-overlay"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center flex-wrap gap-2 sm:gap-2.5"
                >
                  {latestAttemptFeedback.map((letterFb, idx) => {
                    const wordLength = latestAttemptFeedback.length;
                    // Bigger, more visible boxes
                    const sizeClass = wordLength <= 4
                      ? "w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl"
                      : wordLength <= 6
                        ? "w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg"
                        : wordLength <= 8
                          ? "w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base"
                          : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

                    return (
                      <motion.div
                        key={idx}
                        initial={skipAnimations ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
                        animate={skipAnimations ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
                        transition={skipAnimations ? {
                          delay: idx * 0.03,
                          duration: 0.15
                        } : {
                          delay: idx * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        className={cn(
                          "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard text-white",
                          sizeClass,
                          letterFb.feedback === 'green' && "bg-green-500 border-green-700 ring-1 ring-green-300/50",
                          letterFb.feedback === 'yellow' && "bg-yellow-500 border-yellow-600 text-neo-black ring-1 ring-yellow-300/50",
                          letterFb.feedback === 'gray' && "bg-gray-400 border-gray-500"
                        )}
                      >
                        {letterFb.letter}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                // Show hint boxes when no feedback overlay
                <motion.div
                  key="hint-boxes"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center flex-wrap gap-2 sm:gap-2.5"
                >
                  {(() => {
                    // Parse hint to understand revealed letters
                    const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
                    const wordLength = hintChars.length;
                    // Bigger, more visible boxes
                    const sizeClass = wordLength <= 4
                      ? "w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl"
                      : wordLength <= 6
                        ? "w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg"
                        : wordLength <= 8
                          ? "w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base"
                          : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

                    return hintChars.map((char, idx) => {
                      // Check accumulated clues from guesses first (green/yellow)
                      const accumulatedClue = accumulatedClues.get(idx);
                      // Check if revealed by hint OR by shop purchase
                      const isHintRevealed = char !== '_';
                      const isShopRevealed = revealedLetters.has(idx);

                      // Determine display character and color
                      let displayChar: string;
                      let bgClass: string;

                      if (accumulatedClue) {
                        // Accumulated clue takes priority - show letter with appropriate color
                        displayChar = accumulatedClue.letter;
                        bgClass = accumulatedClue.type === 'green'
                          ? "bg-green-500 border-green-700 text-neo-black"
                          : "bg-yellow-500 border-yellow-600 text-neo-black";
                      } else if (isShopRevealed) {
                        displayChar = targetWord[idx]?.toUpperCase() || '?';
                        bgClass = "bg-green-500 border-green-700 text-neo-black";
                      } else if (isHintRevealed) {
                        displayChar = char;
                        bgClass = "bg-green-500 border-green-700 text-neo-black";
                      } else {
                        displayChar = '?';
                        bgClass = "bg-neo-black border-neo-black text-white";
                      }

                      const isRevealed = !!accumulatedClue || isHintRevealed || isShopRevealed;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.03, type: "spring", stiffness: 300 }}
                          className={cn(
                            "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard",
                            sizeClass,
                            bgClass,
                            // Add subtle glow for revealed letters
                            isRevealed && accumulatedClue?.type === 'green' && "ring-1 ring-green-300/50",
                            isRevealed && accumulatedClue?.type === 'yellow' && "ring-1 ring-yellow-300/50"
                          )}
                        >
                          {displayChar}
                        </motion.div>
                      );
                    });
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fixed height wrapper to prevent layout jumps when switching between feedback/hint states */}
          <div className="min-h-[40px] sm:min-h-[44px] flex flex-col justify-center">
            {/* Feedback legend when showing overlay */}
            <AnimatePresence mode="wait">
              {showFeedbackOverlay && latestAttemptFeedback ? (
                <motion.div
                  key="feedback-legend"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center gap-2 mt-1 text-[10px] sm:text-xs"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded border border-green-700"></span>
                    <span className="text-gray-600 dark:text-gray-400">{t('wordHunt.feedback.correct') || 'Correct'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded border border-yellow-600"></span>
                    <span className="text-gray-600 dark:text-gray-400">{t('wordHunt.feedback.wrongPlace') || 'Wrong place'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded border border-gray-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">{t('wordHunt.feedback.notInWord') || 'Not in word'}</span>
                  </span>
                </motion.div>
              ) : (
                /* Known letters indicator below boxes */
                <motion.div
                  key="known-letters"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-0.5 mt-0.5"
                >
                  {/* Known letters (yellow) display - letters in word but not in right place */}
                  {knownLetters.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1 text-[10px] sm:text-xs"
                    >
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                        {t('wordHunt.survival.knownLetters') || 'Wrong spot:'}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from(knownLetters).map((letter) => (
                          <span
                            key={letter}
                            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-yellow-500 border border-yellow-600 rounded text-neo-black font-bold text-xs"
                          >
                            {letter}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}


      {/* Category and example (if unlocked) */}
      {showCategory && (
        <div className="text-[11px] bg-purple-50 dark:bg-purple-900/20 border border-purple-300 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5">
          <span className="font-bold">{t('wordHunt.survival.category')?.replace('{category}', category) || `Category: ${category}`}</span>
        </div>
      )}
      {showExample && (
        <div className="text-[11px] bg-green-50 dark:bg-green-900/20 border border-green-300 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5">
          <span className="font-bold">{t('wordHunt.survival.exampleSentence') || 'Example:'}</span> {exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
        </div>
      )}


      {/* Life bar - positioned directly above board */}
      <div className="flex items-center gap-2 mb-1 max-w-3xl mx-auto w-full relative">
        {/* Life gain animation - positioned above the life bar section, outside overflow-hidden */}
        <LifeGainAnimation
          amount={lifeGainAmount}
          onComplete={() => setLifeGainAmount(null)}
        />

        {/* Beating heart icon - prominent and animated */}
        <motion.div
          key={`heart-${isLifeGaining ? 'beating' : 'idle'}`}
          className={cn(
            "flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-neo-black shadow-hard",
            lifePoints > 66 ? "bg-green-500" : lifePoints > 33 ? "bg-yellow-500" : "bg-red-500",
            isLifeGaining && "heart-beating"
          )}
          animate={
            !skipAnimations && lifePoints <= 20 && !isGameOver && !isLifeGaining
              ? { scale: [1, 1.15, 1] }
              : {}
          }
          transition={{ duration: 0.6, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
        >
          <Heart className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 text-white fill-white",
            isLifeGaining && "heart-beating"
          )} />
        </motion.div>

        {/* Life bar - taller and more prominent */}
        <motion.div
          className={cn(
            "flex-1 bg-gray-200 dark:bg-gray-700 rounded-neo h-8 sm:h-9 overflow-hidden border-3 shadow-hard relative",
            lifePoints <= 20 ? "border-red-500" : "border-neo-black",
            isLifeGaining && "life-gain-flash life-meter-pulse"
          )}
          animate={
            lifePoints <= 20 && !isGameOver && !isLifeGaining
              ? {
                  scale: [1, 1.02, 1],
                  borderColor: ['#ef4444', '#dc2626', '#ef4444']
                }
              : {}
          }
          transition={{ duration: 0.5, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
        >
          <motion.div
            className={cn(
              "h-full flex items-center justify-center text-sm sm:text-base font-black text-white",
              getLifeColor(),
              lifePoints <= 20 && !isLifeGaining && "animate-pulse"
            )}
            animate={{
              width: `${Math.max(lifePoints, 15)}%`, // Minimum width to show text
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {Math.floor(lifePoints)}/100
            </span>
          </motion.div>

          {/* Life drain particles effect when low on life - disabled on low-end devices */}
          {!skipAnimations && lifePoints <= 33 && lifePoints > 0 && !isGameOver && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-red-500 rounded-full"
                  initial={{ x: `${lifePoints}%`, y: '50%', opacity: 1 }}
                  animate={{
                    x: [`${lifePoints}%`, `${lifePoints + 20}%`],
                    y: ['50%', `${30 + i * 20}%`],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* Game Grid - with screenshot protection */}
      <div className="flex items-center justify-center relative">
        <div className={cn(
          "transition-all duration-200",
          isProtected && "blur-xl pointer-events-none select-none"
        )}>
          <GridComponent
            grid={grid}
            interactive={!isGameOver && !isProtected}
            onWordSubmit={handleWordSubmit}
            onWordChange={handleWordChange}
            hideWordPreview
            hideComboIndicator
            comboLevel={0}
            eliminatedLetters={eliminatedLetters}
          />
        </div>
        {/* Screenshot protection overlay */}
        {isProtected && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-yellow shadow-hard text-center">
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">
                {t('daily.screenshotProtection') || 'Click here to continue'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clue Shop Modal */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShop(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">{t('wordHunt.survival.shop') || 'Clue Shop'}</h3>
              <div className="space-y-2">
                {CLUE_SHOP_ITEMS.map(item => {
                  // Get translated names and descriptions for shop items
                  const itemNames: Record<string, string> = {
                    'reveal_letter': t('wordHunt.survival.revealLetter') || 'Reveal Letter',
                    'eliminate_letters': t('wordHunt.survival.eliminateLetters') || 'Eliminate Wrong Letters',
                    'example_sentence': t('wordHunt.survival.exampleSentence') || 'Example Sentence',
                    'reveal_category': t('wordHunt.survival.revealCategory') || 'Reveal Category',
                  };
                  const itemDescs: Record<string, string> = {
                    'reveal_letter': t('wordHunt.survival.revealLetterDesc') || 'Reveal a random letter in the target word',
                    'eliminate_letters': t('wordHunt.survival.eliminateLettersDesc') || 'Remove 3 letters that are NOT in the word',
                    'example_sentence': t('wordHunt.survival.exampleSentenceDesc') || 'See the word used in a sentence',
                    'reveal_category': t('wordHunt.survival.revealCategoryDesc') || 'Show the word category',
                  };

                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePurchase(item)}
                      disabled={clueTokens < item.cost}
                      className={cn(
                        "w-full p-3 rounded-neo border-2 border-neo-black text-left transition-all",
                        clueTokens >= item.cost
                          ? "bg-neo-yellow hover:shadow-hard cursor-pointer"
                          : "bg-gray-200 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-bold">{itemNames[item.id] || item.name}</span>
                          </div>
                          <div className="text-xs text-gray-600">{itemDescs[item.id] || item.description}</div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Coins className="w-4 h-4 text-yellow-600" />
                          <span className="font-bold">{item.cost}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => setShowShop(false)} className="w-full mt-4">
                {t('common.close') || 'Close'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Tip Tooltip - shows after 15 seconds if player hasn't discovered any words */}
      <SwipeTipTooltip
        isVisible={contextualGuidance.showSwipeTip}
        onDismiss={contextualGuidance.dismissSwipeTip}
        t={t}
      />

      {/* Word Feedback Toast */}
      <WordFeedbackToast
        type={feedbackType}
        message={feedbackMessage}
        onClose={closeToast}
      />

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('daily.quitConfirmTitle') || 'Quit Challenge?'}
        description={t('daily.quitConfirm') || 'If you quit, this will count as your attempt for today. You won\'t be able to try again until tomorrow.'}
        confirmText={t('daily.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={() => {
          setShowQuitConfirm(false);
          onQuit();
        }}
        variant="danger"
      />
    </motion.div>
  );
};

export default DailyWordHuntSurvival;
