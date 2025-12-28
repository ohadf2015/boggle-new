'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import GridComponent from '@/components/GridComponent';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { LetterGrid, Language } from '@/types';
import {
  getLetterFeedback,
  feedbackToEmoji,
  isTargetWordFound,
  getLetterKnowledge,
  type LetterFeedback,
  type FeedbackType
} from '@/utils/wordHuntFeedback';

const MAX_ATTEMPTS = 10;

interface DailyWordHuntGameProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string; // The word players need to find
  onComplete: (result: WordHuntGameResult) => void;
  onQuit: () => void;
}

export interface WordHuntAttempt {
  word: string;
  feedback: LetterFeedback[];
  timestamp: number;
}

export interface WordHuntGameResult {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attempts: WordHuntAttempt[];
}

/**
 * DailyWordHuntGame - Wordle-style word deduction game
 * Players have 10 attempts to find the target word using color-coded feedback
 */
const DailyWordHuntGame: React.FC<DailyWordHuntGameProps> = ({
  grid,
  puzzleNumber,
  language,
  targetWord,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  const { playWordAcceptedSound } = useSoundEffects();
  const isLandscape = useMobileLandscape();

  // Game state
  const [attempts, setAttempts] = useState<WordHuntAttempt[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');

  // Word forming state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Help panel state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Calculate letter knowledge from all attempts
  const letterKnowledge = getLetterKnowledge(attempts);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
    setCurrentFeedback(''); // Clear feedback when forming new word
  }, []);

  // Validate that word is on the grid
  const isWordOnGrid = useCallback((word: string): boolean => {
    // For now, simple check - in production, GridComponent validates this
    // We trust the grid component's word submission
    return word.length >= targetWord.length;
  }, [targetWord.length]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();

    // Check if word is the correct length
    if (normalizedWord.length !== normalizedTarget.length) {
      setCurrentFeedback(t('wordHunt.wrongLength')
        .replace('{expected}', String(normalizedTarget.length))
        .replace('{got}', String(normalizedWord.length)));
      return;
    }

    // Check if word already submitted
    if (attempts.some(a => a.word.toUpperCase() === normalizedWord)) {
      setCurrentFeedback(t('wordHunt.alreadyGuessed'));
      return;
    }

    // Get feedback for this attempt
    const feedback = getLetterFeedback(normalizedWord, normalizedTarget);
    const newAttempt: WordHuntAttempt = {
      word: normalizedWord,
      feedback,
      timestamp: Date.now(),
    };

    // Add attempt to list
    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    playWordAcceptedSound?.();

    // Check if word is correct (all green)
    const won = isTargetWordFound(feedback);
    if (won) {
      setHasWon(true);
      setIsGameOver(true);
      setCurrentFeedback(t('wordHunt.victory'));

      // Complete game with victory
      onComplete({
        solved: true,
        attemptsUsed: newAttempts.length,
        targetWord,
        attempts: newAttempts,
      });
      return;
    }

    // Check if out of attempts
    if (newAttempts.length >= MAX_ATTEMPTS) {
      setIsGameOver(true);
      setCurrentFeedback(t('wordHunt.defeat').replace('{word}', targetWord));

      // Complete game with defeat
      onComplete({
        solved: false,
        attemptsUsed: newAttempts.length,
        targetWord,
        attempts: newAttempts,
      });
      return;
    }

    // Game continues
    setCurrentFeedback(t('wordHunt.keepGoing'));
  }, [isGameOver, targetWord, attempts, t, playWordAcceptedSound, onComplete]);

  // Quit confirmation
  const handleQuitClick = useCallback(() => {
    if (window.confirm(t('daily.quitConfirm'))) {
      // Complete game with current state
      onComplete({
        solved: false,
        attemptsUsed: attempts.length,
        targetWord,
        attempts,
      });
    }
  }, [attempts, targetWord, onComplete, t]);

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
      {/* Top bar with quit button */}
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
        <span className="px-2 py-0.5 bg-neo-purple/20 text-neo-black dark:text-neo-purple text-xs font-bold rounded-full">
          🎯 #{puzzleNumber}
        </span>
      </div>

      {/* Attempts counter */}
      <div className="flex items-center justify-center mb-2">
        <div className="px-4 py-2 bg-neo-blue/10 dark:bg-neo-blue/20 border-2 border-neo-black rounded-neo">
          <span className="text-sm font-bold">
            {t('wordHunt.attemptsRemaining')
              .replace('{current}', String(attempts.length))
              .replace('{max}', String(MAX_ATTEMPTS))}
          </span>
        </div>
      </div>

      {/* Feedback message */}
      <AnimatePresence mode="wait">
        {currentFeedback && (
          <motion.div
            key={currentFeedback}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center mb-2"
          >
            <span className={cn(
              "text-sm font-medium px-3 py-1 rounded-full",
              hasWon ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            )}>
              {currentFeedback}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous attempts display */}
      <div className="mb-2 max-h-32 overflow-y-auto">
        <div className="space-y-1">
          {attempts.map((attempt, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-center gap-1"
            >
              <span className="text-xs text-gray-500 w-6">{idx + 1}.</span>
              <div className="flex gap-1">
                {attempt.feedback.map((letterFb, letterIdx) => (
                  <div
                    key={letterIdx}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center font-bold text-white rounded border-2 border-neo-black",
                      letterFb.feedback === 'green' && "bg-green-500",
                      letterFb.feedback === 'yellow' && "bg-yellow-500",
                      letterFb.feedback === 'gray' && "bg-gray-400"
                    )}
                  >
                    {letterFb.letter}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Current word forming area */}
      <div className="flex items-center justify-center mb-2">
        <div className="min-h-[40px] px-4 py-2 bg-white dark:bg-gray-800 border-2 border-neo-black rounded-neo">
          <span className="text-lg font-bold tracking-wider">
            {formedWord || t('wordHunt.formWord')}
          </span>
        </div>
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
          comboLevel={0}
        />
      </div>

      {/* Letter knowledge keyboard (shows what letters are green/yellow/gray) */}
      <div className="mt-2">
        <div className="text-center text-xs text-gray-500 mb-1">
          {t('wordHunt.letterKnowledge')}
        </div>
        <div className="flex flex-wrap justify-center gap-1 max-w-md mx-auto">
          {Array.from(letterKnowledge.entries()).map(([letter, feedbackType]) => (
            <div
              key={letter}
              className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold text-white rounded border border-neo-black",
                feedbackType === 'green' && "bg-green-500",
                feedbackType === 'yellow' && "bg-yellow-500",
                feedbackType === 'gray' && "bg-gray-400"
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      {/* Target word length hint */}
      <div className="text-center mt-2 text-sm text-gray-600">
        {t('wordHunt.targetLength').replace('{length}', String(targetWord.length))}
      </div>

      {/* Help Button */}
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

export default DailyWordHuntGame;
