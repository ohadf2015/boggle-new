'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { AccumulatedClue } from './types';
import { MAX_ATTEMPTS } from './constants';

export interface SurvivalClueBoxesProps {
  currentHint: HintLevel | null;
  targetWord: string;
  attempts: { word: string; feedback: LetterFeedback[]; timestamp: number }[];
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  knownLetters: Set<string>;
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;
  isClueGaining: boolean;
  isProtected: boolean;
  skipAnimations: boolean;
  gameDir: 'ltr' | 'rtl';
  t: (key: string) => string;
}

/**
 * Clue boxes display with feedback overlay and hint system
 */
export const SurvivalClueBoxes = forwardRef<HTMLDivElement, SurvivalClueBoxesProps>(({
  currentHint,
  targetWord,
  attempts,
  accumulatedClues,
  revealedLetters,
  knownLetters,
  latestAttemptFeedback,
  showFeedbackOverlay,
  isClueGaining,
  isProtected,
  skipAnimations,
  gameDir,
  t,
}, ref) => {
  if (!currentHint) return null;

  return (
    <motion.div
      ref={ref}
      key={`clue-container-${attempts.length}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mx-auto max-w-3xl w-full px-3 py-3 mb-1 rounded-neo-lg transition-all duration-300",
        "bg-neo-navy/30 dark:bg-neo-navy/50 border-2 border-neo-black/20",
        showFeedbackOverlay
          ? "clue-feedback-active clue-container-attention"
          : isClueGaining
            ? "clue-container-green-glow"
            : "clue-container-glow",
        isProtected && "blur-xl select-none"
      )}
    >
      {/* Tries counter */}
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
      <div dir={gameDir} className="flex justify-center flex-wrap gap-2 sm:gap-2.5 px-2">
        <AnimatePresence mode="wait">
          {showFeedbackOverlay && latestAttemptFeedback ? (
            <FeedbackOverlay
              feedback={latestAttemptFeedback}
              skipAnimations={skipAnimations}
            />
          ) : (
            <HintBoxes
              currentHint={currentHint}
              targetWord={targetWord}
              accumulatedClues={accumulatedClues}
              revealedLetters={revealedLetters}
              attempts={attempts}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Legend / Known letters indicator */}
      <div className="min-h-[40px] sm:min-h-[44px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {showFeedbackOverlay && latestAttemptFeedback ? (
            <FeedbackLegend t={t} />
          ) : (
            <KnownLettersDisplay knownLetters={knownLetters} t={t} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

SurvivalClueBoxes.displayName = 'SurvivalClueBoxes';

// Sub-components

interface FeedbackOverlayProps {
  feedback: LetterFeedback[];
  skipAnimations: boolean;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ feedback, skipAnimations }) => {
  const wordLength = feedback.length;
  const sizeClass = wordLength <= 4
    ? "w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl"
    : wordLength <= 6
      ? "w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg"
      : wordLength <= 8
        ? "w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base"
        : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

  return (
    <motion.div
      key="feedback-overlay"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center flex-wrap gap-2 sm:gap-2.5"
    >
      {feedback.map((letterFb, idx) => (
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
      ))}
    </motion.div>
  );
};

interface HintBoxesProps {
  currentHint: HintLevel;
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  attempts: { word: string; feedback: LetterFeedback[]; timestamp: number }[];
}

const HintBoxes: React.FC<HintBoxesProps> = ({
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
  attempts,
}) => {
  const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
  const wordLength = hintChars.length;

  // Compute persisted letters from attempts (most recent yellow/green at each position)
  // Priority: green > yellow (from most recent to oldest attempt)
  const persistedLetters = React.useMemo(() => {
    const result = new Map<number, { letter: string; type: 'green' | 'yellow' }>();

    // Process attempts in order (older to newer) so newer overwrites older
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'green') {
          // Green always wins at this position
          result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
        } else if (fb.feedback === 'yellow') {
          // Yellow only sets if no green exists at this position yet
          const existing = result.get(fb.position);
          if (!existing || existing.type !== 'green') {
            result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'yellow' });
          }
        }
        // Gray letters don't persist
      }
    }

    return result;
  }, [attempts]);
  const sizeClass = wordLength <= 4
    ? "w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl"
    : wordLength <= 6
      ? "w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg"
      : wordLength <= 8
        ? "w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base"
        : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

  return (
    <motion.div
      key="hint-boxes"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center flex-wrap gap-2 sm:gap-2.5"
    >
      {hintChars.map((char, idx) => {
        const accumulatedClue = accumulatedClues.get(idx);
        const persistedLetter = persistedLetters.get(idx);
        const isHintRevealed = char !== '_';
        const isShopRevealed = revealedLetters.has(idx);

        let displayChar: string;
        let bgClass: string;
        let clueType: 'green' | 'yellow' | null = null;

        // Priority: green from accumulatedClues > shop revealed > hint revealed > persisted letter > unknown
        if (accumulatedClue) {
          displayChar = accumulatedClue.letter;
          clueType = accumulatedClue.type;
          bgClass = accumulatedClue.type === 'green'
            ? "bg-green-500 border-green-700 text-neo-black"
            : "bg-yellow-500 border-yellow-600 text-neo-black";
        } else if (isShopRevealed) {
          displayChar = targetWord[idx]?.toUpperCase() || '?';
          clueType = 'green';
          bgClass = "bg-green-500 border-green-700 text-neo-black";
        } else if (isHintRevealed) {
          displayChar = char;
          clueType = 'green';
          bgClass = "bg-green-500 border-green-700 text-neo-black";
        } else if (persistedLetter) {
          // Show persisted yellow letter from previous guesses
          displayChar = persistedLetter.letter;
          clueType = persistedLetter.type;
          bgClass = persistedLetter.type === 'green'
            ? "bg-green-500 border-green-700 text-neo-black"
            : "bg-yellow-500 border-yellow-600 text-neo-black";
        } else {
          displayChar = '?';
          bgClass = "bg-neo-black border-neo-black text-white";
        }

        const isRevealed = !!accumulatedClue || isHintRevealed || isShopRevealed || !!persistedLetter;

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
              isRevealed && clueType === 'green' && "ring-1 ring-green-300/50",
              isRevealed && clueType === 'yellow' && "ring-1 ring-yellow-300/50"
            )}
          >
            {displayChar}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

interface FeedbackLegendProps {
  t: (key: string) => string;
}

const FeedbackLegend: React.FC<FeedbackLegendProps> = ({ t }) => (
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
);

interface KnownLettersDisplayProps {
  knownLetters: Set<string>;
  t: (key: string) => string;
}

const KnownLettersDisplay: React.FC<KnownLettersDisplayProps> = ({ knownLetters, t }) => (
  <motion.div
    key="known-letters"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="flex flex-col items-center gap-0.5 mt-0.5"
  >
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
);
