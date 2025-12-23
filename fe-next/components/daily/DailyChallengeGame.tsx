'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { applyHebrewFinalLetters } from '@/utils/utils';
import { cn } from '@/lib/utils';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast, wordAcceptedToast, wordNeedsValidationToast } from '@/components/NeoToast';
import { calculateComboTimeout } from '@/shared/utils/comboUtils';
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
  isValid: boolean | null; // null = pending validation
  comboLevel: number;
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

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Feedback state (for WordFormingArea)
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

  // Help panel state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const validWordCountRef = useRef(0);
  const gameStartTimeRef = useRef<number>(Date.now());
  const lastWordTimeRef = useRef<number | null>(null);
  const maxComboRef = useRef(0);
  const remainingTimeRef = useRef(duration); // Track remaining time to avoid stale closure

  // Latest values refs
  const scoreRef = useRef(score);
  const foundWordsRef = useRef(foundWords);
  const comboLevelRef = useRef(comboLevel);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
  useEffect(() => { comboLevelRef.current = comboLevel; }, [comboLevel]);

  // Game music - handles in-game music, urgent music after 33% elapsed
  useGameMusic({
    phase: 'playing',
    remainingTime,
    totalTime: duration,
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
        const newTime = prev - 1;
        remainingTimeRef.current = newTime; // Update ref for handleGameEnd
        if (newTime <= 0) {
          clearInterval(timerRef.current!);
          handleGameEnd();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameOver]);

  // Game end handler - validates pending words with AI before completing
  const handleGameEnd = useCallback(async () => {
    if (gameOverCalledRef.current) return;
    gameOverCalledRef.current = true;
    setIsGameOver(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    const currentWords = foundWordsRef.current;
    const pendingWords = currentWords.filter(w => w.isValid === null);
    let finalWords = currentWords;

    // Batch validate pending words with AI (like singleplayer)
    if (pendingWords.length > 0) {
      try {
        const response = await fetch('/api/validate-words-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words: pendingWords.map(pw => pw.word),
            language,
            minWordLength: 2,
          }),
        });
        const result = await response.json();

        if (result.success && Array.isArray(result.results)) {
          const validationMap = new Map<string, boolean>();
          for (const r of result.results) {
            validationMap.set(r.word, r.isValid);
          }

          finalWords = currentWords.map(w => {
            if (w.isValid === null) {
              const isValid = validationMap.get(w.word) ?? false;
              return { ...w, isValid };
            }
            return w;
          });
        } else {
          // On error, mark pending words as invalid
          finalWords = currentWords.map(w =>
            w.isValid === null ? { ...w, isValid: false } : w
          );
        }
      } catch {
        // On error, mark pending words as invalid
        finalWords = currentWords.map(w =>
          w.isValid === null ? { ...w, isValid: false } : w
        );
      }
    }

    // Calculate final score from validated words only
    const validWords = finalWords.filter(w => w.isValid === true);
    const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);
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
      score: finalScore,
      wordCount: words.length,
      wordsByLength,
      timeSeconds: duration - remainingTimeRef.current, // Use ref to avoid stale closure
      words,
      longestWord,
    };

    onComplete(result);
  }, [duration, onComplete, language]);

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

  // Reset combo timeout - uses proper timing from comboUtils
  const resetComboTimeout = useCallback((newComboLevel: number) => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    const timeout = calculateComboTimeout(newComboLevel);
    comboTimeoutRef.current = setTimeout(() => {
      setComboLevel(0);
      comboLevelRef.current = 0;
      lastWordTimeRef.current = null;
    }, timeout);
  }, []);

  // Handle word submission - validates against dictionary like singleplayer
  const handleWordSubmit = useCallback(async (word: string) => {
    if (isGameOver) return;

    const now = Date.now();

    // Normalize word
    let normalizedWord = word.toUpperCase();
    if (language === 'he') {
      normalizedWord = applyHebrewFinalLetters(word);
    }

    const lowerWord = normalizedWord.toLowerCase();

    // Check if already found
    if (foundWordsSetRef.current.has(lowerWord)) {
      const msg = t('game.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      // Reset combo on duplicate
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      comboLevelRef.current = 0;
      lastWordTimeRef.current = null;
      return;
    }

    // Check minimum length
    if (normalizedWord.length < 2) {
      const msg = t('game.wordTooShort') || 'Too short!';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      return;
    }

    // Check if word is on board
    if (!isWordOnBoard(normalizedWord, grid, language)) {
      const msg = t('game.wordNotOnBoard') || 'Not on board!';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      // Reset combo on invalid word
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      comboLevelRef.current = 0;
      lastWordTimeRef.current = null;
      return;
    }

    // Validate word locally (basic checks only)
    const foundWordsForValidation = foundWordsRef.current.map(w => ({ word: w.word, isValid: w.isValid }));
    const validation = validateWordLocally(normalizedWord, language, 2, foundWordsForValidation);

    if (!validation.isValid) {
      const errorKey = validation.errorKey ?? 'Invalid word';
      const msg = t(errorKey) || errorKey;
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      // Reset combo on invalid word
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      comboLevelRef.current = 0;
      lastWordTimeRef.current = null;
      return;
    }

    // Add to found words set immediately to prevent double submission
    foundWordsSetRef.current.add(lowerWord);

    // Get current combo level for scoring
    const currentCombo = comboLevelRef.current;
    const baseScore = calculateWordScore(normalizedWord, 0); // Base score without combo

    // Add word with pending state and base score
    const newWord: FoundWord = {
      word: normalizedWord,
      score: baseScore,
      timestamp: now,
      isValid: null, // Pending - will update after dictionary check
      comboLevel: currentCombo,
    };
    setFoundWords(prev => [...prev, newWord]);

    // Validate against dictionary API (same as singleplayer)
    try {
      const response = await fetch('/api/dictionary/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: lowerWord, language }),
      });
      const result = await response.json();

      if (result.isValid) {
        // Word is in dictionary/community - valid immediately
        validWordCountRef.current++;

        // Calculate full score with combo
        const fullScore = calculateWordScore(normalizedWord, currentCombo);

        // Update word to valid with full score
        setFoundWords(prev => prev.map(fw =>
          fw.word === normalizedWord && fw.timestamp === now
            ? { ...fw, isValid: true, score: fullScore }
            : fw
        ));

        // Add full score
        setScore(prev => prev + fullScore);

        // Update combo level
        const newCombo = currentCombo + 1;
        setComboLevel(newCombo);
        comboLevelRef.current = newCombo;
        lastWordTimeRef.current = now;

        // Track max combo
        if (newCombo > maxComboRef.current) {
          maxComboRef.current = newCombo;
        }

        // Reset combo timeout
        resetComboTimeout(newCombo);

        // Sound effects
        if (newCombo >= 3) {
          playComboSound?.(newCombo);
        } else {
          playWordAcceptedSound?.();
        }

        // Show accepted feedback in WordFormingArea
        setCurrentFeedback({
          id: `accept-${now}`,
          type: 'accepted',
          word: normalizedWord.toUpperCase(),
          score: fullScore,
          timestamp: now,
        });
      } else {
        // Word NOT in dictionary - stays pending for AI validation at game end
        // BREAK combo (like singleplayer)
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        setComboLevel(0);
        comboLevelRef.current = 0;
        lastWordTimeRef.current = null;

        // Show pending notification
        setCurrentFeedback({
          id: `pending-${now}`,
          type: 'pending',
          word: normalizedWord.toUpperCase(),
          timestamp: now,
        });
      }
    } catch {
      // On API error, treat as pending - also breaks combo
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      comboLevelRef.current = 0;
      lastWordTimeRef.current = null;
      setCurrentFeedback({
        id: `pending-${Date.now()}`,
        type: 'pending',
        word: normalizedWord.toUpperCase(),
        timestamp: Date.now(),
      });
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
        timeSeconds: duration - remainingTimeRef.current, // Use ref to avoid stale closure
        words: [],
        longestWord: '',
      };
      onComplete(result);
    }
  }, [duration, onComplete, t]);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

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
      {/* Timer row - Timer, Combo, Score all together */}
      <div className={cn(
        "flex items-center justify-center gap-3 mb-1",
        isLandscape && "flex-col h-full mr-4 mb-0"
      )}>
        {/* Quit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuitClick}
          className="text-gray-600 hover:text-red-500 p-1"
        >
          <FaTimes className="w-4 h-4" />
        </Button>

        {/* Timer */}
        <CircularTimer
          remainingTime={remainingTime}
          totalTime={duration}
          size="sm"
        />

        {/* Combo next to timer */}
        <ComboDisplay comboLevel={comboLevel} />

        {/* Score */}
        <div className="bg-neo-yellow border-3 border-neo-black rounded-neo shadow-hard px-2 py-1 min-w-[60px]">
          <div className="text-[10px] text-neo-black uppercase font-bold text-center">{t('common.score')}</div>
          <div className="text-lg font-black text-neo-black text-center">
            {score}
          </div>
        </div>

        {/* Puzzle number */}
        <span className="hidden sm:inline-block px-2 py-0.5 bg-neo-yellow/20 text-neo-yellow text-[10px] font-bold rounded-full">
          #{puzzleNumber}
        </span>
      </div>

      {/* Word Forming Area with feedback - centered below timer */}
      <div className={cn("flex items-center justify-center mb-1", isLandscape && "hidden")}>
        <WordFormingArea
          word={formedWord}
          letterCount={letterCount}
          feedback={currentFeedback}
          compact
        />
      </div>

      {/* Game Grid */}
      <div className={cn(
        "flex-1 flex items-center justify-center",
        isLandscape && "items-start"
      )}>
        <GridComponent
          grid={grid}
          interactive={true}
          onWordSubmit={handleWordSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator={true}
          comboLevel={comboLevel}
        />
      </div>

      {/* Word count */}
      <div className="text-center mt-2 sm:mt-4">
        <span className="text-sm text-gray-600">
          {t('daily.wordsFound').replace('{count}', String(foundWords.filter(w => w.isValid === true).length))}
          {foundWords.filter(w => w.isValid === null).length > 0 && (
            <span className="text-neo-yellow ml-1">
              (+{foundWords.filter(w => w.isValid === null).length} {t('common.pending') || 'pending'})
            </span>
          )}
        </span>
      </div>

      {/* Help Button - Fixed position */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className={isLandscape
          ? "fixed top-4 right-4 z-30"
          : "fixed bottom-24 right-4 z-40 safe-area-bottom"
        }
      />

      {/* Help Panel */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </motion.div>
  );
};

export default DailyChallengeGame;
