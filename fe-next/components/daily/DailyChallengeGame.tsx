'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { applyHebrewFinalLetters } from '@/utils/utils';
import { cn } from '@/lib/utils';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast, wordAcceptedToast } from '@/components/NeoToast';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { LetterGrid, Language } from '@/types';

interface DailyChallengeGameProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  duration: number; // in seconds
  onComplete: (result: DailyChallengeGameResult) => void;
  onQuit: () => void;
}

interface DailyChallengeGameResult {
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>;
  timeSeconds: number;
  words: string[];
  longestWord: string;
}

interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  isValid: boolean;
}

/**
 * DailyChallengeGame - Core game component for daily challenge
 * Simplified version without bots, earthquakes, or fire rounds
 */
const DailyChallengeGame: React.FC<DailyChallengeGameProps> = ({
  grid,
  puzzleNumber,
  language,
  duration,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound } = useSoundEffects();
  const { stopMusic } = useMusic();
  const isLandscape = useMobileLandscape();

  // Game state
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [comboLevel, setComboLevel] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const validWordCountRef = useRef(0);
  const gameStartTimeRef = useRef<number>(Date.now());

  // Latest values refs
  const scoreRef = useRef(score);
  const foundWordsRef = useRef(foundWords);
  const comboLevelRef = useRef(comboLevel);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
  useEffect(() => { comboLevelRef.current = comboLevel; }, [comboLevel]);

  // Game music
  useGameMusic({
    phase: 'playing',
    remainingTime,
    isPaused: isGameOver,
    enabled: true,
  });

  // Stop music on unmount
  useEffect(() => {
    return () => {
      stopMusic(500);
    };
  }, [stopMusic]);

  // Timer
  useEffect(() => {
    if (isGameOver) return;

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameOver]);

  // Game end handler
  const handleGameEnd = useCallback(() => {
    if (gameOverCalledRef.current) return;
    gameOverCalledRef.current = true;
    setIsGameOver(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const validWords = foundWordsRef.current.filter(w => w.isValid);
    const words = validWords.map(w => w.word);

    // Calculate words by length
    const wordsByLength: Record<number, number> = {};
    words.forEach(word => {
      const len = word.length;
      wordsByLength[len] = (wordsByLength[len] || 0) + 1;
    });

    // Find longest word
    const longestWord = words.reduce((longest, word) =>
      word.length > longest.length ? word : longest, '');

    const result: DailyChallengeGameResult = {
      score: scoreRef.current,
      wordCount: words.length,
      wordsByLength,
      timeSeconds: duration - remainingTime,
      words,
      longestWord,
    };

    onComplete(result);
  }, [duration, remainingTime, onComplete]);

  // Calculate word score
  const calculateWordScore = useCallback((word: string, combo: number): number => {
    // Base score: word length - 1
    const baseScore = Math.max(1, word.length - 1);

    // Combo multiplier
    let multiplier = 1;
    if (combo >= 11) multiplier = 2.25;
    else if (combo >= 9) multiplier = 2;
    else if (combo >= 7) multiplier = 1.75;
    else if (combo >= 5) multiplier = 1.5;
    else if (combo >= 3) multiplier = 1.25;

    return Math.round(baseScore * multiplier);
  }, []);

  // Reset combo timeout
  const resetComboTimeout = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setComboLevel(0);
    }, 3000); // Reset combo after 3 seconds of no words
  }, []);

  // Handle word submission
  const handleWordSubmit = useCallback(async (word: string) => {
    if (isGameOver) return;

    // Normalize word
    let normalizedWord = word.toUpperCase();
    if (language === 'he') {
      normalizedWord = applyHebrewFinalLetters(word);
    }

    // Check if already found
    if (foundWordsSetRef.current.has(normalizedWord.toLowerCase())) {
      wordErrorToast(t('game.wordAlreadyFound') || 'Already found!');
      return;
    }

    // Check minimum length
    if (normalizedWord.length < 2) {
      wordErrorToast(t('game.wordTooShort') || 'Too short!');
      return;
    }

    // Check if word is on board
    if (!isWordOnBoard(normalizedWord, grid, language)) {
      wordErrorToast(t('game.wordNotOnBoard') || 'Not on board!');
      return;
    }

    // Validate word locally (synchronous validation for basic checks)
    const foundWordsForValidation = foundWordsRef.current.map(w => ({ word: w.word, isValid: w.isValid }));
    const validation = validateWordLocally(normalizedWord, language, 2, foundWordsForValidation);

    if (validation.isValid) {
      // Word accepted
      foundWordsSetRef.current.add(normalizedWord.toLowerCase());
      validWordCountRef.current++;

      // Update combo
      const newCombo = comboLevelRef.current + 1;
      setComboLevel(newCombo);
      resetComboTimeout();

      // Calculate score
      const wordScore = calculateWordScore(normalizedWord, newCombo);

      // Add to found words
      const newWord: FoundWord = {
        word: normalizedWord,
        score: wordScore,
        timestamp: Date.now(),
        isValid: true,
      };
      setFoundWords(prev => [...prev, newWord]);
      setScore(prev => prev + wordScore);

      // Sound effects
      if (newCombo >= 3) {
        playComboSound?.(newCombo);
      } else {
        playWordAcceptedSound?.();
      }

      wordAcceptedToast(normalizedWord, { score: wordScore, comboLevel: newCombo });
    } else {
      // Word rejected
      wordErrorToast(validation.errorKey ? t(validation.errorKey) || 'Not valid' : t('game.wordNotValid') || 'Not a valid word!');
    }
  }, [isGameOver, language, grid, t, calculateWordScore, resetComboTimeout, playWordAcceptedSound, playComboSound]);

  // Quit confirmation
  const handleQuitClick = useCallback(() => {
    if (window.confirm(t('daily.quitConfirm'))) {
      // Mark as played with score 0 so they can't retry
      const result: DailyChallengeGameResult = {
        score: 0,
        wordCount: 0,
        wordsByLength: {},
        timeSeconds: duration - remainingTime,
        words: [],
        longestWord: '',
      };
      onComplete(result);
    }
  }, [duration, remainingTime, onComplete, t]);

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
      {/* Header with timer and score */}
      <div className={cn(
        "flex items-center justify-between mb-2 sm:mb-4",
        isLandscape && "flex-col h-full mr-4 mb-0"
      )}>
        {/* Quit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuitClick}
          className="text-gray-400 hover:text-red-500"
        >
          <FaTimes className="w-5 h-5" />
        </Button>

        {/* Timer */}
        <div className={cn("flex items-center gap-2", isLandscape && "my-4")}>
          <CircularTimer
            remainingTime={remainingTime}
            totalTime={duration}
            size={isLandscape ? 'sm' : 'md'}
          />
        </div>

        {/* Score display */}
        <div className={cn(
          "text-right",
          isLandscape && "mt-auto"
        )}>
          <div className="text-xs text-gray-400 uppercase font-bold">{t('common.score')}</div>
          <div className="text-2xl sm:text-3xl font-black text-neo-yellow">
            {score}
          </div>
          {comboLevel >= 3 && (
            <div className="text-xs text-neo-orange font-bold animate-pulse">
              🔥 x{comboLevel} {t('common.combo').toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Puzzle number badge */}
      <div className="text-center mb-2">
        <span className="inline-block px-3 py-1 bg-neo-yellow/20 text-neo-yellow text-xs font-bold rounded-full">
          {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
        </span>
      </div>

      {/* Game Grid */}
      <div className={cn(
        "flex-1 flex items-center justify-center",
        isLandscape && "items-start"
      )}>
        <GridComponent
          grid={grid}
          onWordSubmit={handleWordSubmit}
          comboLevel={comboLevel}
        />
      </div>

      {/* Word count */}
      <div className="text-center mt-2 sm:mt-4">
        <span className="text-sm text-gray-400">
          {t('daily.wordsFound').replace('{count}', String(foundWords.filter(w => w.isValid).length))}
        </span>
      </div>
    </motion.div>
  );
};

export default DailyChallengeGame;
