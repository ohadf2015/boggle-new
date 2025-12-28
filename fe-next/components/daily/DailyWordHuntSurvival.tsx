'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, ShoppingBag, X, Heart, Coins, Lightbulb } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { LetterGrid, Language } from '@/types';
import {
  getLetterFeedback,
  isTargetWordFound,
  type LetterFeedback,
} from '@/utils/wordHuntFeedback';
import {
  generateProgressiveHints,
  getNextHint,
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

  // Survival state
  const [lifePoints, setLifePoints] = useState(INITIAL_LIFE);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Word discovery state
  const [discoveredWords, setDiscoveredWords] = useState<WordDiscovery[]>([]);
  const [clueTokens, setClueTokens] = useState(0);

  // Target word attempts
  const [attempts, setAttempts] = useState<TargetAttempt[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');

  // Toast feedback system
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Life gain animation
  const [lifeGainAmount, setLifeGainAmount] = useState<number | null>(null);

  // Hint system
  const [availableHints, setAvailableHints] = useState<HintLevel[]>([]);
  const [currentHint, setCurrentHint] = useState<HintLevel | null>(null);
  const [category, setCategory] = useState<string>('');
  const [exampleSentence, setExampleSentence] = useState<string>('');
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [eliminatedLetters, setEliminatedLetters] = useState<Set<string>>(new Set());
  const [showCategory, setShowCategory] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [hintUnlockAnimation, setHintUnlockAnimation] = useState(false);

  // UI state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);

  // Refs for life drain
  const lifeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverRef = useRef(false);

  // Session tracking
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());

  // Load AI hints on mount
  useEffect(() => {
    async function loadHints() {
      const hints = await generateProgressiveHints(targetWord, language);
      setAvailableHints(hints.hints);
      setCategory(hints.category);
      setExampleSentence(hints.exampleSentence);

      // Show first hint immediately
      if (hints.hints.length > 0) {
        setCurrentHint(hints.hints[0]);
      }
    }
    loadHints();
  }, [targetWord, language]);

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
          handleGameOver(false); // Died
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

  // Update hints when words discovered
  useEffect(() => {
    const nextHint = getNextHint(availableHints, discoveredWords.length);
    if (nextHint && (!currentHint || nextHint.level > currentHint.level)) {
      // Trigger unlock animation when upgrading hint level (not on initial load)
      if (currentHint && nextHint.level > currentHint.level) {
        setHintUnlockAnimation(true);
        // Play sound effect for hint unlock
        playWordAcceptedSound?.();
        // Reset animation after delay
        setTimeout(() => setHintUnlockAnimation(false), 1500);
      }
      setCurrentHint(nextHint);
    }
  }, [discoveredWords.length, availableHints, currentHint, playWordAcceptedSound]);

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
    setCurrentFeedback('');
    closeToast();
  }, [closeToast]);

  // Handle word submission (could be target attempt OR grid word discovery)
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();

    // Check if attempting target word (exact match only)
    if (normalizedWord === normalizedTarget) {
      handleTargetAttempt(normalizedWord, normalizedTarget);
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
        handleWordDiscovery(normalizedWord);
        handleTargetAttempt(normalizedWord, normalizedTarget);
      } else {
        // Not a valid word, just record as failed target attempt
        handleTargetAttempt(normalizedWord, normalizedTarget);
      }
    } else {
      // Different length - it's only a grid word discovery
      handleWordDiscovery(normalizedWord);
    }
  }, [isGameOver, targetWord, discoveredWords, attempts, grid, language, showToast, t]);

  // Handle target word attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    // Check if already attempted
    if (attempts.some(a => a.word === word)) {
      setCurrentFeedback(t('wordHunt.alreadyGuessed'));
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

    // Check if correct
    const won = isTargetWordFound(feedback);
    if (won) {
      handleGameOver(true, newAttempts); // Victory - pass the updated attempts array
      return;
    }

    // Check if out of attempts
    if (newAttempts.length >= MAX_ATTEMPTS) {
      handleGameOver(false, newAttempts); // Failed - pass the updated attempts array
      return;
    }

    setCurrentFeedback(t('wordHunt.keepGoing'));
  }, [attempts, playWordAcceptedSound, t]);

  // Handle grid word discovery
  const handleWordDiscovery = useCallback((word: string) => {
    // Check minimum length (3+ letters for daily challenge word discovery)
    if (word.length < 3) {
      showToast('too-short', t('wordHunt.feedback.tooShort') || '📏 Minimum 3 letters');
      return;
    }

    // Check if already discovered
    if (discoveredWords.some(w => w.word === word)) {
      showToast('duplicate', t('wordHunt.feedback.duplicate') || '🔁 Already found!');
      return;
    }

    // Check if word is actually on the board
    if (!isWordOnBoard(word, grid, language)) {
      showToast('not-on-board', t('wordHunt.feedback.notOnBoard') || '⚠️ Can\'t form this on the board');
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

    // Show success feedback
    showToast('valid-word', `+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}`);
    setCurrentFeedback(`+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}`);
  }, [discoveredWords, grid, language, playWordAcceptedSound, showToast, t]);

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

  // Handle clue shop purchases
  const handlePurchase = useCallback((item: ClueShopItem) => {
    if (clueTokens < item.cost) {
      setCurrentFeedback(t('wordHunt.survival.notEnoughTokens') || 'Not enough tokens!');
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
          setCurrentFeedback(t('wordHunt.survival.cannotRevealMore') || 'Cannot reveal more letters');
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
  }, [clueTokens, targetWord, revealedLetters, eliminatedLetters, playWordAcceptedSound]);

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
      <div className="flex items-center justify-between mb-2 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuit}
          className="text-gray-600 hover:text-red-500"
        >
          <X className="w-4 h-4 mr-1" />
          {t('common.quit') || 'Quit'}
        </Button>
        <span className="px-2 py-0.5 bg-neo-purple/20 text-neo-black dark:text-neo-purple text-xs font-bold rounded-full">
          🎯 #{puzzleNumber}
        </span>
      </div>

      {/* Life bar + Clue tokens */}
      <div className="flex items-center gap-3 mb-2">
        {/* Life bar */}
        <motion.div
          className={cn(
            "flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden border-2 relative",
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
              animate={lifePoints <= 20 && !isGameOver ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: lifePoints <= 20 ? Infinity : 0 }}
            >
              <Heart className="w-3 h-3 mr-1 fill-current" />
            </motion.div>
            {lifePoints}/100
          </motion.div>

          {/* Life drain particles effect when low on life */}
          {lifePoints <= 33 && lifePoints > 0 && !isGameOver && (
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

          {/* Life gain animation */}
          <LifeGainAnimation
            amount={lifeGainAmount}
            onComplete={() => setLifeGainAmount(null)}
          />
        </motion.div>

        {/* Clue tokens */}
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold text-sm">{clueTokens}</span>
        </div>

        {/* Shop button - subtle indicator when tokens available */}
        <Button
          size="sm"
          onClick={() => setShowShop(!showShop)}
          className="bg-neo-purple text-white relative hover:bg-neo-purple/80"
        >
          <ShoppingBag className="w-4 h-4" />
          {clueTokens > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-yellow text-neo-black text-xs font-bold rounded-full flex items-center justify-center border border-neo-black">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Current hint - compact on mobile */}
      {currentHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: hintUnlockAnimation ? [1, 1.05, 1] : 1,
            borderColor: hintUnlockAnimation ? ['#3b82f6', '#fbbf24', '#3b82f6'] : '#3b82f6'
          }}
          transition={{ duration: hintUnlockAnimation ? 0.5 : 0.3 }}
          className={cn(
            "border-2 rounded-neo p-2 sm:p-3 mb-1.5 relative overflow-hidden mx-1",
            hintUnlockAnimation
              ? "bg-gradient-to-r from-yellow-50 to-blue-50 dark:from-yellow-900/30 dark:to-blue-900/30 border-yellow-500"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
          )}
        >
          {/* Unlock animation sparkles */}
          {hintUnlockAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-3xl sm:text-4xl">✨</span>
            </motion.div>
          )}

          <div className="flex items-center gap-2">
            <motion.div
              animate={hintUnlockAnimation ? { rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Lightbulb className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0",
                hintUnlockAnimation ? "text-yellow-500" : "text-blue-600"
              )} />
            </motion.div>
            <div className="flex-1 flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "text-[10px] sm:text-xs font-bold whitespace-nowrap",
                hintUnlockAnimation ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
              )}>
                {hintUnlockAnimation
                  ? (t('wordHunt.survival.hintUnlocked') || '🎉 New!')
                  : (t('wordHunt.survival.hintLevel')?.replace('{level}', String(currentHint.level)) || `Lvl ${currentHint.level}`)
                }
              </div>
              <motion.div
                key={currentHint.hint}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-lg sm:text-2xl font-mono font-bold tracking-widest flex-1 text-center"
              >
                {currentHint.hint}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next hint progress - compact inline design */}
      {(() => {
        const nextHint = availableHints.find(h => h.unlockCost > discoveredWords.length);
        if (nextHint && currentHint) {
          const wordsNeeded = nextHint.unlockCost - discoveredWords.length;
          const progress = discoveredWords.length - (currentHint.unlockCost || 0);
          const total = nextHint.unlockCost - (currentHint.unlockCost || 0);
          const progressPercent = total > 0 ? Math.min(100, (progress / total) * 100) : 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-1.5 px-2 flex items-center gap-2"
            >
              <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                {t('wordHunt.survival.nextHint') || 'Next'} Lvl {nextHint.level}:
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 whitespace-nowrap">
                {wordsNeeded} more
              </span>
            </motion.div>
          );
        } else if (currentHint?.level === 5) {
          // All hints unlocked
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[10px] sm:text-xs text-green-600 dark:text-green-400 mb-1.5 font-bold"
            >
              ✅ {t('wordHunt.survival.allHintsUnlocked') || 'All hints unlocked!'}
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Category and example (if unlocked) */}
      {showCategory && (
        <div className="text-xs bg-purple-50 dark:bg-purple-900/20 border border-purple-300 rounded p-2 mb-2">
          <span className="font-bold">{t('wordHunt.survival.category')?.replace('{category}', category) || `Category: ${category}`}</span>
        </div>
      )}
      {showExample && (
        <div className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-300 rounded p-2 mb-2">
          <span className="font-bold">{t('wordHunt.survival.exampleSentence') || 'Example:'}</span> {exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
        </div>
      )}

      {/* Target word display - responsive with wrapping for long words */}
      <div className="flex justify-center flex-wrap gap-1.5 sm:gap-2 mb-3 px-2">
        {renderTargetWord()}
      </div>

      {/* Prominent Attempts Counter */}
      <motion.div
        className={cn(
          "flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-neo border-2 sm:border-3 mb-1.5 mx-2",
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
      </motion.div>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {currentFeedback && (
          <motion.div
            key={currentFeedback}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-2 text-sm font-medium"
          >
            {currentFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Grid */}
      <div className="flex-1 flex items-center justify-center">
        <GridComponent
          grid={grid}
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator
          comboLevel={0}
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
    </motion.div>
  );
};

export default DailyWordHuntSurvival;
