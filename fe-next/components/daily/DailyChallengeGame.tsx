'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import WordFormingArea from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { cn } from '@/lib/utils';
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

/**
 * DailyChallengeGame - Core game component for daily challenge
 * Refactored to use shared hooks for combo, timer, and word submission
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
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Help panel state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Refs for game end handler
  const gameOverCalledRef = useRef(false);
  const scoreRef = useRef(score);
  const handleGameEndRef = useRef<(() => void) | null>(null);

  // Keep score ref in sync
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Stable callback for timer - prevents timer restart on every render
  const stableOnTimeUp = useCallback(() => {
    if (!gameOverCalledRef.current) {
      handleGameEndRef.current?.();
    }
  }, []);

  // === SHARED HOOKS ===

  // Combo system - handles combo state, refs, and timeouts
  const combo = useComboSystem({
    onComboSound: (level) => {
      if (level >= 3) {
        playComboSound?.(level);
      }
    },
    trackMaxCombo: true,
  });

  // Game timer - handles countdown with callbacks
  // Uses stableOnTimeUp to prevent timer restart on re-renders
  const timer = useGameTimer({
    initialTime: duration,
    isPaused: isGameOver,
    onTimeUp: stableOnTimeUp,
  });

  // Word submission - handles validation, dictionary checks, and feedback
  const wordSubmission = useWordSubmission({
    grid,
    language,
    minWordLength: 2,
    enableSpamDetection: false, // Daily challenge doesn't need spam detection
    fireRoundActive: false,
    comboLevel: combo.comboLevel,
    t,
    onWordAccepted: (word, wordScore) => {
      setScore(prev => prev + wordScore);
      playWordAcceptedSound?.();
      combo.incrementCombo(true);
    },
    onWordRejected: () => {
      combo.resetCombo();
    },
    onWordPending: () => {
      combo.resetCombo();
    },
    onComboReset: () => {
      combo.resetCombo();
    },
    onComboIncrement: (autoValidated) => {
      if (autoValidated) {
        combo.incrementCombo(true);
      }
    },
  });

  // Game music - handles in-game music, urgent music after 33% elapsed
  useGameMusic({
    phase: 'playing',
    remainingTime: timer.remainingTime,
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

  // Game end handler - validates pending words with AI before completing
  const handleGameEnd = useCallback(async () => {
    if (gameOverCalledRef.current) return;
    gameOverCalledRef.current = true;
    setIsGameOver(true);

    const currentWords = wordSubmission.foundWords;
    const pendingWords = currentWords.filter(w => w.isValid === null);
    let finalWords = currentWords;

    // Batch validate pending words with AI
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

    const gameResult: DailyChallengeGameResult = {
      score: finalScore,
      wordCount: words.length,
      wordsByLength,
      timeSeconds: duration - timer.remainingTimeRef.current,
      words,
      longestWord,
    };

    onComplete(gameResult);
  }, [duration, onComplete, language, wordSubmission.foundWords, timer.remainingTimeRef]);

  // Keep handleGameEnd ref in sync for stable timer callback
  useEffect(() => {
    handleGameEndRef.current = handleGameEnd;
  }, [handleGameEnd]);

  // Quit confirmation
  const handleQuitClick = useCallback(() => {
    if (window.confirm(t('daily.quitConfirm'))) {
      // Mark as played with score 0 so they can't retry
      const result: DailyChallengeGameResult = {
        score: 0,
        wordCount: 0,
        wordsByLength: {},
        timeSeconds: duration - timer.remainingTimeRef.current,
        words: [],
        longestWord: '',
      };
      onComplete(result);
    }
  }, [duration, onComplete, t, timer.remainingTimeRef]);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Handle word submission from grid
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;
    wordSubmission.submitWord(word);
  }, [isGameOver, wordSubmission]);

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
      {/* Top bar with quit button - matches multiplayer layout */}
      <div className={cn(
        "flex items-center justify-between mb-2 px-2",
        isLandscape && "hidden"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuitClick}
          className="text-gray-600 hover:text-red-500"
        >
          <FaTimes className="w-4 h-4 mr-1" />
          {t('common.quit') || 'Quit'}
        </Button>
        {/* Puzzle number badge */}
        <span className="px-2 py-0.5 bg-neo-yellow/20 text-neo-black dark:text-neo-yellow text-xs font-bold rounded-full">
          #{puzzleNumber}
        </span>
      </div>

      {/* Stats row - Combo | Timer | Score - matches multiplayer InGameScreen */}
      <div className={cn(
        "flex items-center justify-center gap-3 md:gap-4 mb-2",
        isLandscape && "flex-col h-full mr-4 mb-0"
      )} role="status" aria-label="Game status">
        {/* Combo (left - placeholder for layout balance) */}
        <div className="min-w-[70px] md:min-w-[90px] flex justify-end">
          <ComboDisplay comboLevel={combo.comboLevel} compact />
        </div>

        {/* Timer (center - always visible and prominent) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-20"
        >
          <CircularTimer
            remainingTime={timer.remainingTime}
            totalTime={duration}
            size="md"
          />
        </motion.div>

        {/* Score (right position) - vibrant yellow/lime gradient like multiplayer */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-3 md:px-4 py-1.5 min-w-[70px] md:min-w-[90px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <motion.div
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xl md:text-2xl font-black text-neo-black leading-tight"
              style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
            >
              {score}
            </motion.div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neo-black/80">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Word Forming Area with feedback - centered below timer */}
      <div className={cn("flex items-center justify-center mb-1", isLandscape && "hidden")}>
        <WordFormingArea
          word={formedWord}
          letterCount={letterCount}
          feedback={wordSubmission.currentFeedback}
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
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator={true}
          comboLevel={combo.comboLevel}
        />
      </div>

      {/* Word count */}
      <div className="text-center mt-2 sm:mt-4">
        <span className="text-sm text-gray-600">
          {t('daily.wordsFound').replace('{count}', String(wordSubmission.validWordCount))}
          {wordSubmission.foundWords.filter(w => w.isValid === null).length > 0 && (
            <span className="text-neo-yellow ml-1">
              (+{wordSubmission.foundWords.filter(w => w.isValid === null).length} {t('common.pending') || 'pending'})
            </span>
          )}
        </span>
      </div>

      {/* Help Button - Fixed at corner, not covering the board */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className={isLandscape
          ? "fixed top-2 right-2 z-30 w-9 h-9 opacity-70 hover:opacity-100"
          : "fixed bottom-0 right-0 z-40 mb-[max(env(safe-area-inset-bottom),8px)] mr-2 w-10 h-10 opacity-70 hover:opacity-100"
        }
      />

      {/* Help Panel */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </motion.div>
  );
};

export default DailyChallengeGame;
