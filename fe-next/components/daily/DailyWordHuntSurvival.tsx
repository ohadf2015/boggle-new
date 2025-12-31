'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Store, X, Heart, Coins, Lightbulb } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
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

const MAX_ATTEMPTS = 10;
const INITIAL_LIFE = 100;
const LIFE_DRAIN_RATE = 2; // points per second
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
  const { playWordAcceptedSound } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const isLandscape = useMobileLandscape();
  const { user } = useAuth();

  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipAnimations = useMemo(() => isLowEnd || !enableComplexAnimations, [isLowEnd, enableComplexAnimations]);

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showShopHint, setShowShopHint] = useState(false);
  const shopHintShownRef = useRef(false);

  // Refs for life drain
  const lifeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverRef = useRef(false);

  // Session tracking
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const gameStartTimeRef = useRef<number>(0);

  // Refs for callbacks that need to be accessed before declaration
  const handleGameOverRef = useRef<((won: boolean, finalAttempts?: TargetAttempt[]) => void) | null>(null);
  const handleTargetAttemptRef = useRef<((word: string, target: string) => void) | null>(null);
  const handleWordDiscoveryRef = useRef<((word: string) => void) | null>(null);

  // Load AI hints on mount
  useEffect(() => {
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

  // Show shop hint when life is low and tokens are available (non-intrusive suggestion)
  useEffect(() => {
    const LOW_LIFE_THRESHOLD = 40; // Show hint when life drops below 40%
    const MIN_TOKENS_FOR_HINT = 60; // Minimum cost of cheapest item

    if (
      !shopHintShownRef.current &&
      !isGameOver &&
      lifePoints <= LOW_LIFE_THRESHOLD &&
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

      // Remove letters from knownLetters if they're now fully accounted for by greens
      allGreenCounts.forEach((greenCount, letter) => {
        const targetCount = targetLetterCounts.get(letter) || 0;
        if (greenCount >= targetCount) {
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

    // Trigger life gain animation
    setLifeGainAmount(lifeGained);

    // Show success feedback (toast only - no duplicate inline feedback)
    showToast('valid-word', `+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}`);
  }, [discoveredWords, grid, language, playWordAcceptedSound, showToast, t, validateWordInDictionary]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex-1 flex flex-col p-2 sm:p-4 overflow-hidden",
        isLandscape && "flex-row"
      )}
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
        <span className="px-2 py-0.5 bg-neo-purple/20 text-neo-black dark:text-neo-purple text-xs font-bold rounded-full">
          🎯 #{puzzleNumber}
        </span>
      </div>

      {/* Target word black boxes - always visible */}
      {currentHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl w-full px-1 mb-0.5"
        >
          {/* Black boxes for target word OR Letter Feedback Overlay */}
          <div className="flex justify-center flex-wrap gap-1 sm:gap-1.5 px-2">
            <AnimatePresence mode="wait">
              {showFeedbackOverlay && latestAttemptFeedback ? (
                // Show colored letter feedback when overlay is active
                <motion.div
                  key="feedback-overlay"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center flex-wrap gap-1 sm:gap-1.5"
                >
                  {latestAttemptFeedback.map((letterFb, idx) => {
                    const wordLength = latestAttemptFeedback.length;
                    const sizeClass = wordLength <= 4
                      ? "w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl"
                      : wordLength <= 6
                        ? "w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg"
                        : wordLength <= 8
                          ? "w-7 h-7 sm:w-9 sm:h-9 text-sm sm:text-base"
                          : "w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm";

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
                          "flex items-center justify-center border-3 rounded-lg font-black shadow-hard text-white",
                          sizeClass,
                          letterFb.feedback === 'green' && "bg-green-500 border-green-700",
                          letterFb.feedback === 'yellow' && "bg-yellow-500 border-yellow-600 text-neo-black",
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
                  className="flex justify-center flex-wrap gap-1 sm:gap-1.5"
                >
                  {(() => {
                    // Parse hint to understand revealed letters
                    const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
                    const wordLength = hintChars.length;
                    // Dynamically size based on word length
                    const sizeClass = wordLength <= 4
                      ? "w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl"
                      : wordLength <= 6
                        ? "w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg"
                        : wordLength <= 8
                          ? "w-7 h-7 sm:w-9 sm:h-9 text-sm sm:text-base"
                          : "w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm";

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
                            "flex items-center justify-center border-3 rounded-lg font-black shadow-hard",
                            sizeClass,
                            bgClass
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

          {/* Feedback legend when showing overlay */}
          <AnimatePresence>
            {showFeedbackOverlay && latestAttemptFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: 0.3 }}
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
            )}
          </AnimatePresence>

          {/* Hint level indicator below boxes - hide when showing feedback */}
          {!showFeedbackOverlay && (
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              <div className="flex items-center gap-1">
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                <span className="text-[10px] sm:text-xs font-bold text-gray-500">
                  {t('wordHunt.survival.hintLevel')?.replace('{level}', String(currentHint.level)) || `Hint Lvl ${currentHint.level}`}
                </span>
              </div>
              {/* Known letters (yellow) display */}
              {knownLetters.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1 text-[10px] sm:text-xs"
                >
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {t('wordHunt.survival.knownLetters') || 'Contains:'}
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
            </div>
          )}
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


      {/* Prominent Attempts Counter */}
      <motion.div
        className={cn(
          "flex flex-col gap-0.5 rounded-neo border-2 mx-auto max-w-3xl w-full mb-0.5",
          MAX_ATTEMPTS - attempts.length <= 2
            ? "bg-red-100 dark:bg-red-900/30 border-red-500"
            : MAX_ATTEMPTS - attempts.length <= 4
              ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500"
              : "bg-green-100 dark:bg-green-900/30 border-green-500"
        )}
        animate={MAX_ATTEMPTS - attempts.length <= 2 && !isGameOver ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{ duration: 0.5, repeat: MAX_ATTEMPTS - attempts.length <= 2 ? Infinity : 0 }}
      >
        {/* Main row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-2 py-0.5 sm:py-1">
          {/* Attempts dots indicator */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {[...Array(MAX_ATTEMPTS)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-neo-black/50",
                  i < attempts.length
                    ? "bg-gray-400 dark:bg-gray-600" // Used attempt
                    : MAX_ATTEMPTS - attempts.length <= 2
                      ? "bg-red-500" // Critical - remaining
                      : MAX_ATTEMPTS - attempts.length <= 4
                        ? "bg-yellow-500" // Warning - remaining
                        : "bg-green-500" // Safe - remaining
                )}
                initial={false}
                animate={i === attempts.length - 1 && attempts.length > 0 ? {
                  scale: [1, 0.5, 1]
                } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          {/* Text indicator */}
          <div className={cn(
            "text-xs sm:text-sm font-black",
            MAX_ATTEMPTS - attempts.length <= 2
              ? "text-red-600 dark:text-red-400"
              : MAX_ATTEMPTS - attempts.length <= 4
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-green-600 dark:text-green-400"
          )}>
            {MAX_ATTEMPTS - attempts.length} {t('wordHunt.survival.triesLeft') || 'left'}
          </div>

          {/* Words discovered - integrated */}
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            📖 {discoveredWords.length}
          </div>
        </div>

        {/* Hint: Only matching length words count as tries */}
        <div className="text-[9px] sm:text-[10px] text-center text-gray-500 dark:text-gray-400 pb-0.5 px-2">
          {t('wordHunt.survival.onlyMatchingLengthHint')?.replace('{length}', String(targetWord.length)) || `Only ${targetWord.length}-letter words use tries`}
        </div>
      </motion.div>


      {/* Life bar + Clue tokens - positioned directly above board */}
      <div className="flex items-center gap-2 mb-1 max-w-3xl mx-auto w-full relative">
        {/* Life gain animation - positioned above the life bar section, outside overflow-hidden */}
        <LifeGainAnimation
          amount={lifeGainAmount}
          onComplete={() => setLifeGainAmount(null)}
        />

        {/* Life bar */}
        <motion.div
          className={cn(
            "flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden border-2",
            lifePoints <= 20 ? "border-red-500" : "border-neo-black"
          )}
          animate={
            lifePoints <= 20 && !isGameOver
              ? {
                  scale: [1, 1.02, 1],
                  borderColor: ['#ef4444', '#dc2626', '#ef4444']
                }
              : {}
          }
          transition={{ duration: 0.5, repeat: lifePoints <= 20 ? Infinity : 0 }}
        >
          <motion.div
            className={cn(
              "h-full flex items-center justify-center text-xs font-bold text-white transition-all",
              getLifeColor(),
              lifePoints <= 20 && "animate-pulse"
            )}
            animate={{
              width: `${lifePoints}%`,
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={!skipAnimations && lifePoints <= 20 && !isGameOver ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: !skipAnimations && lifePoints <= 20 ? Infinity : 0 }}
            >
              <Heart className="w-3 h-3 mr-1 fill-current" />
            </motion.div>
            {lifePoints}/100
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

        {/* Clue tokens */}
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold text-sm">{clueTokens}</span>
        </div>

        {/* Shop button - subtle indicator when tokens available */}
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
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
              >
                <div className="bg-neo-yellow text-neo-black text-xs font-bold px-3 py-1.5 rounded-neo border-2 border-neo-black whitespace-nowrap shadow-hard-sm">
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  {t('wordHunt.survival.needHelp') || 'Need help? Try a clue!'}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-neo-black" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex items-center justify-center">
        <GridComponent
          grid={grid}
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator
          comboLevel={0}
          eliminatedLetters={eliminatedLetters}
        />
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

      {/* Help Button */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-0 right-0 z-40 mb-[max(env(safe-area-inset-bottom),8px)] mr-2 w-10 h-10"
      />

      {/* Help Panel */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

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
