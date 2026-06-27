'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { AccumulatedClue, TargetAttempt } from './types';
import { MAX_ATTEMPTS, GRAY_LETTER_FADE_DELAY } from './constants';
import { inferTargetLetterCounts, exactLetterCounts, computeYellowState } from '@/utils/wordHuntYellowLogic';

export interface SurvivalClueBoxesProps {
  currentHint: HintLevel | null;
  targetWord: string;
  attempts: TargetAttempt[];
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  knownLetters: Set<string>;
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;
  isClueGaining: boolean;
  skipAnimations: boolean;
  gameDir: 'ltr' | 'rtl';
  t: (key: string) => string;
  /** Formed word currently equals target length — submitting will consume a try. */
  matchesTargetLength?: boolean;
  /**
   * Force the short-landscape compact treatment (small tiles, tight spacing,
   * collapsed reserved slots) regardless of the `max-height:560px` media query.
   * Word Hunt MP sets this on wide-but-short viewports (e.g. 1530×695) where the
   * grid would otherwise be squished by the full-size clue boxes. SP daily
   * survival never passes it, so its behaviour is unchanged.
   */
  compact?: boolean;
}

/**
 * Clue-tile size classes, keyed by word length. `compact` returns small fixed
 * sizes (mirroring the `max-height:560px` values) so a tight column on a wide
 * screen gets the same breathing room a short phone already does. The default
 * branch keeps the responsive sizes for normal play.
 */
function tileSizeClass(wordLength: number, compact?: boolean): string {
  if (compact) {
    return wordLength <= 4
      ? 'w-7 h-7 text-xs rounded border shadow-none'
      : wordLength <= 8
        ? 'w-6 h-6 text-[10px] rounded border shadow-none'
        : 'w-5 h-5 text-[9px] rounded border shadow-none';
  }
  return wordLength <= 4
    ? 'w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl [@media(max-height:560px)]:w-7 [@media(max-height:560px)]:h-7 [@media(max-height:560px)]:text-xs [@media(max-height:560px)]:rounded [@media(max-height:560px)]:border [@media(max-height:560px)]:shadow-none'
    : wordLength <= 6
      ? 'w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg [@media(max-height:560px)]:w-6 [@media(max-height:560px)]:h-6 [@media(max-height:560px)]:text-[10px] [@media(max-height:560px)]:rounded [@media(max-height:560px)]:border [@media(max-height:560px)]:shadow-none'
      : wordLength <= 8
        ? 'w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base [@media(max-height:560px)]:w-6 [@media(max-height:560px)]:h-6 [@media(max-height:560px)]:text-[10px] [@media(max-height:560px)]:rounded [@media(max-height:560px)]:border [@media(max-height:560px)]:shadow-none'
        : 'w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm [@media(max-height:560px)]:w-5 [@media(max-height:560px)]:h-5 [@media(max-height:560px)]:text-[9px] [@media(max-height:560px)]:rounded [@media(max-height:560px)]:border [@media(max-height:560px)]:shadow-none';
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
  skipAnimations,
  gameDir,
  t,
  matchesTargetLength = false,
  compact = false,
}, ref) => {
  if (!currentHint) return null;

  const showMatchWarning = matchesTargetLength && !showFeedbackOverlay;

  return (
    <AdaptiveMotion.div
      ref={ref}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mx-auto max-w-3xl w-full transition-all duration-300",
        "bg-neo-navy/30 dark:bg-neo-navy/50 border-neo-black/20",
        compact
          ? "px-1.5 py-px mb-0 border rounded-md"
          : "px-3 py-2 mb-0.5 border-2 rounded-neo-lg [@media(max-height:560px)]:py-px [@media(max-height:560px)]:px-1.5 [@media(max-height:560px)]:mb-0 [@media(max-height:560px)]:border [@media(max-height:560px)]:rounded-md",
        showFeedbackOverlay
          ? "clue-feedback-active clue-container-attention animate-pulse ring-2 ring-neo-lime/60"
          : showMatchWarning
            ? "animate-pulse ring-2 ring-neo-pink/80 shadow-hard"
            : isClueGaining
              ? "clue-container-green-glow"
              : "clue-container-glow"
      )}
    >
      {/* Reserved slot — always rendered with a min-height floor so the warning
          appearing (word reaches target length) / disappearing (on submit) never
          reflows the boxes below. Collapses on short landscape where the warning
          is hidden anyway. Mirrors the legend row's min-h reservation. */}
      <div
        data-testid="match-target-warning-slot"
        className={cn(
          "flex items-center justify-center",
          compact
            ? "hidden min-h-0 mb-0"
            : "min-h-[1.5rem] sm:min-h-[1.75rem] mb-1 [@media(max-height:560px)]:hidden [@media(max-height:560px)]:min-h-0 [@media(max-height:560px)]:mb-0",
        )}
      >
        {showMatchWarning && (
          <span
            data-testid="match-target-warning"
            className="text-center text-sm sm:text-base font-black text-neo-pink animate-neo-pop"
            role="status"
            aria-live="polite"
          >
            ⚠ {t('wordHunt.survival.matchesTargetWarning')}
          </span>
        )}
      </div>
      {/* Tries counter - only count non-discovery attempts */}
      {(() => {
        const targetAttempts = attempts.filter(a => !a.isDiscovery).length;
        const triesRemaining = MAX_ATTEMPTS - targetAttempts;
        return (
          <div className={cn("text-center", compact ? "mb-0.5" : "mb-2 [@media(max-height:560px)]:mb-0.5")}>
            <span className={cn(
              "font-black",
              compact ? "text-sm" : "text-xl sm:text-2xl [@media(max-height:560px)]:text-sm",
              triesRemaining <= 2
                ? "text-neo-red"
                : triesRemaining <= 4
                  ? "text-neo-yellow"
                  : "text-neo-white"
            )}>
              {triesRemaining}/{MAX_ATTEMPTS} {t('wordHunt.survival.triesLeft')}
            </span>
          </div>
        );
      })()}

      {/* Black boxes for target word OR Letter Feedback Overlay.
          CSS-grid stacking ([&>*]:[grid-area:1/1]) overlaps the exiting + entering
          box rows in ONE cell during the AnimatePresence crossfade — otherwise
          mode="sync" keeps both mounted in normal flow and they wrap to a second
          row, doubling the height for ~150ms and shifting the grid on every submit. */}
      <div dir={gameDir} className="grid w-full [&>*]:[grid-area:1/1] [@media(max-height:560px)]:px-0 px-2">
        <AdaptiveAnimatePresence mode="sync">
          {showFeedbackOverlay && latestAttemptFeedback ? (
            <FeedbackOverlay
              feedback={latestAttemptFeedback}
              targetWordLength={targetWord.length}
              skipAnimations={skipAnimations}
              compact={compact}
            />
          ) : (
            <HintBoxes
              currentHint={currentHint}
              targetWord={targetWord}
              accumulatedClues={accumulatedClues}
              revealedLetters={revealedLetters}
              attempts={attempts}
              compact={compact}
            />
          )}
        </AdaptiveAnimatePresence>
      </div>

      {/* Legend / Known letters indicator. Floor collapses on short landscape so the grid keeps room. */}
      <div className={cn(
        "flex flex-col justify-center",
        compact ? "min-h-0" : "min-h-[40px] sm:min-h-[44px] [@media(max-height:560px)]:min-h-0",
      )}>
        <AdaptiveAnimatePresence mode="sync">
          {showFeedbackOverlay && latestAttemptFeedback ? (
            <FeedbackLegend t={t} />
          ) : (
            <KnownLettersDisplay
              knownLetters={knownLetters}
              noCluesYet={accumulatedClues.size === 0 && knownLetters.size === 0 && revealedLetters.size === 0}
              t={t}
            />
          )}
        </AdaptiveAnimatePresence>
      </div>
    </AdaptiveMotion.div>
  );
});

SurvivalClueBoxes.displayName = 'SurvivalClueBoxes';

// Sub-components

/**
 * Normalizes feedback array to match target word length.
 * - If submitted word is shorter: pads with placeholder feedback
 * - If submitted word is longer: truncates to target length
 */
function normalizeToTargetLength(
  feedback: LetterFeedback[],
  targetLength: number
): LetterFeedback[] {
  if (feedback.length === targetLength) {
    return feedback;
  }

  if (feedback.length > targetLength) {
    // Truncate to target length
    return feedback.slice(0, targetLength);
  }

  // Pad with placeholder feedback for remaining positions
  const normalized = [...feedback];
  for (let i = feedback.length; i < targetLength; i++) {
    normalized.push({
      letter: '?',
      feedback: 'gray',
      position: i,
    });
  }
  return normalized;
}

interface FeedbackOverlayProps {
  feedback: LetterFeedback[];
  targetWordLength: number;
  skipAnimations: boolean;
  compact?: boolean;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ feedback, targetWordLength, skipAnimations, compact }) => {
  // Gray letters flash briefly then fade to '?' after a delay
  const [grayFaded, setGrayFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGrayFaded(true), GRAY_LETTER_FADE_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Normalize feedback to match target word length
  const normalizedFeedback = normalizeToTargetLength(feedback, targetWordLength);
  const wordLength = normalizedFeedback.length;
  const sizeClass = tileSizeClass(wordLength, compact);

  return (
    <AdaptiveMotion.div
      key="feedback-overlay"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="flex justify-center flex-nowrap gap-1.5 sm:gap-2.5"
    >
      {normalizedFeedback.map((letterFb, idx) => {
        const isClue = letterFb.feedback === 'green' || letterFb.feedback === 'yellow';
        const isGray = !isClue;
        const showGrayLetter = isGray && !grayFaded;
        return (
          <AdaptiveMotion.div
            key={`fb-${idx}-${letterFb.letter}`}
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
              "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard transition-colors duration-500",
              sizeClass,
              letterFb.feedback === 'green' && "bg-neo-lime border-neo-black text-neo-black ring-1 ring-neo-lime/50",
              letterFb.feedback === 'yellow' && "bg-neo-yellow border-neo-black text-neo-black ring-1 ring-neo-yellow/50",
              isGray && showGrayLetter && "bg-neo-navy-light border-neo-cream/30 text-neo-white",
              isGray && !showGrayLetter && "bg-neo-black border-neo-black text-neo-white"
            )}
          >
            {isClue ? letterFb.letter : (showGrayLetter ? letterFb.letter : '?')}
          </AdaptiveMotion.div>
        );
      })}
    </AdaptiveMotion.div>
  );
};

interface HintBoxesProps {
  currentHint: HintLevel;
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  attempts: TargetAttempt[];
  compact?: boolean;
}

const HintBoxes: React.FC<HintBoxesProps> = ({
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
  attempts,
  compact,
}) => {
  const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
  const wordLength = hintChars.length;

  // Determine letter counts: exact when target is known, inferred from feedback when unknown (MP)
  const letterCounts = React.useMemo(() => {
    const isUnknown = targetWord.split('').every(c => c === '?');
    return isUnknown ? inferTargetLetterCounts(attempts) : exactLetterCounts(targetWord);
  }, [targetWord, attempts]);

  const { persistedLetters } = React.useMemo(
    () => computeYellowState(attempts, letterCounts, accumulatedClues),
    [attempts, letterCounts, accumulatedClues]
  );
  const sizeClass = tileSizeClass(wordLength, compact);

  return (
    <AdaptiveMotion.div
      key="hint-boxes"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="flex justify-center flex-nowrap gap-1.5 sm:gap-2.5"
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
            ? "bg-neo-lime border-neo-black text-neo-black"
            : "bg-neo-yellow border-neo-black text-neo-black";
        } else if (isShopRevealed) {
          displayChar = targetWord[idx]?.toUpperCase() || '?';
          clueType = 'green';
          bgClass = "bg-neo-lime border-neo-black text-neo-black";
        } else if (isHintRevealed) {
          displayChar = char;
          clueType = 'green';
          bgClass = "bg-neo-lime border-neo-black text-neo-black";
        } else if (persistedLetter) {
          displayChar = persistedLetter.letter;
          clueType = persistedLetter.type;
          bgClass = persistedLetter.type === 'green'
            ? "bg-neo-lime border-neo-black text-neo-black"
            : "bg-neo-yellow border-neo-black text-neo-black";
        } else {
          displayChar = '?';
          bgClass = "bg-neo-black border-neo-black text-neo-white";
        }

        const isRevealed = !!accumulatedClue || isHintRevealed || isShopRevealed || !!persistedLetter;

        return (
          <AdaptiveMotion.div
            key={`hint-${idx}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.03, type: "spring", stiffness: 300 }}
            className={cn(
              "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard",
              sizeClass,
              bgClass,
              isRevealed && clueType === 'green' && "ring-1 ring-neo-lime/50",
              isRevealed && clueType === 'yellow' && "ring-1 ring-neo-yellow/50"
            )}
          >
            {displayChar}
          </AdaptiveMotion.div>
        );
      })}
    </AdaptiveMotion.div>
  );
};

interface FeedbackLegendProps {
  t: (key: string) => string;
}

const FeedbackLegend: React.FC<FeedbackLegendProps> = ({ t }) => (
  <AdaptiveMotion.div
    key="feedback-legend"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="flex items-center justify-center gap-2 mt-1 text-[10px] sm:text-xs"
  >
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-neo-lime rounded border border-neo-black"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.correct')}</span>
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-neo-yellow rounded border border-neo-black"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.wrongPlace')}</span>
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-neo-navy-light rounded border border-neo-cream/30"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.notInWord')}</span>
    </span>
  </AdaptiveMotion.div>
);

interface KnownLettersDisplayProps {
  knownLetters: Set<string>;
  /** No clues revealed yet → prompt the player to spell board words. */
  noCluesYet?: boolean;
  t: (key: string) => string;
}

const KnownLettersDisplay: React.FC<KnownLettersDisplayProps> = ({ knownLetters, noCluesYet, t }) => (
  <AdaptiveMotion.div
    key="known-letters"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="flex flex-col items-center gap-0.5 mt-0.5"
  >
    {/* Empty-state cue: the blank boxes don't explain themselves, so when no
        clue has been revealed yet we say HOW to reveal them — spell words on the
        grid. This is the in-context rule (tutorials get ignored). */}
    {noCluesYet && (
      <span
        data-testid="clue-empty-cue"
        className="text-[10px] sm:text-xs font-bold text-neo-cyan animate-pulse text-center leading-snug"
        role="status"
        aria-live="polite"
      >
        🔍 {t('wordHunt.survival.findWordsToReveal')}
      </span>
    )}
    {knownLetters.size > 0 && (
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1 text-[10px] sm:text-xs"
      >
        <span className="text-neo-yellow font-medium">
          {t('wordHunt.survival.knownLetters')}
        </span>
        <div className="flex gap-0.5">
          {Array.from(knownLetters).map((letter) => (
            <span
              key={letter}
              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-neo-yellow border border-neo-black rounded text-neo-black font-bold text-xs"
            >
              {letter}
            </span>
          ))}
        </div>
      </AdaptiveMotion.div>
    )}
  </AdaptiveMotion.div>
);
