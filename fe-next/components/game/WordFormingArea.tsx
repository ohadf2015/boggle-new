'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Hebrew final letters (sofit) mapping - non-final to final form
const HEBREW_FINAL_LETTERS: Record<string, string> = {
  'כ': 'ך', // kaf
  'מ': 'ם', // mem
  'נ': 'ן', // nun
  'פ': 'ף', // peh
  'צ': 'ץ', // tsadi
};

/**
 * Convert the last letter of a word to its Hebrew final form (sofit) if applicable
 */
function applyHebrewFinalLetter(word: string): string {
  if (!word || word.length === 0) return word;

  const lastChar = word[word.length - 1];
  const finalForm = HEBREW_FINAL_LETTERS[lastChar];

  if (finalForm) {
    return word.slice(0, -1) + finalForm;
  }

  return word;
}

export interface WordFeedback {
  id: string;
  type: 'accepted' | 'rejected' | 'pending' | 'duplicate';
  word: string;
  score?: number;
  message?: string;
  fireRoundActive?: boolean;
  fireRoundBonus?: number;
  timestamp: number;
}

interface WordFormingAreaProps {
  word: string;
  letterCount: number;
  className?: string;
  /** Compact mode for inline layouts */
  compact?: boolean;
  /** Word validation feedback */
  feedback?: WordFeedback | null;
}

/**
 * WordFormingArea - Display area for word being formed with integrated validation feedback
 * Shows the word being formed, then smoothly MORPHS to show accept/reject/duplicate feedback
 * The element stays visible and transforms - no hide/show cycle
 * Memoized to prevent unnecessary re-renders
 */
const WordFormingArea = React.memo<WordFormingAreaProps>(({
  word,
  letterCount,
  className,
  compact = false,
  feedback,
}) => {
  const [visibleFeedback, setVisibleFeedback] = useState<WordFeedback | null>(null);
  const [lastWord, setLastWord] = useState<string>('');
  const [lastLetterCount, setLastLetterCount] = useState<number>(0);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track the last word being formed (so we can show it during feedback)
  useEffect(() => {
    if (word.length > 0) {
      setLastWord(word);
      setLastLetterCount(letterCount);
    }
  }, [word, letterCount]);

  // Handle feedback display - persists until replaced or user starts forming new word
  useEffect(() => {
    if (feedback) {
      setVisibleFeedback(feedback);
      // Clear any existing timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    }
  }, [feedback]);

  // Clear feedback when user starts forming a new word
  useEffect(() => {
    if (word.length > 0 && visibleFeedback) {
      setVisibleFeedback(null);
    }
  }, [word, visibleFeedback]); // Fixed: proper dependencies

  // Determine current state
  const isForming = word.length > 0;
  const showFeedback = visibleFeedback !== null;
  const showForming = isForming && !showFeedback;

  // Show content if we're forming OR have feedback OR have a last word to show
  const hasContent = showForming || showFeedback || lastWord.length > 0;

  // Get display word - forming word, feedback word, or last word
  // Apply Hebrew final letters (sofit) transformation for proper display
  const rawDisplayWord = showForming ? word : (showFeedback ? visibleFeedback?.word : lastWord);
  const displayWord = rawDisplayWord ? applyHebrewFinalLetter(rawDisplayWord) : rawDisplayWord;
  const displayLetterCount = showForming ? letterCount : lastLetterCount;

  // Container size classes
  const containerClasses = cn(
    'flex items-center justify-center relative',
    compact ? 'h-10 min-h-[40px] min-w-[100px]' : 'h-14 min-h-[56px] min-w-[140px]',
    className
  );

  // Get background color based on state
  const getBgColor = () => {
    if (showFeedback) {
      switch (visibleFeedback?.type) {
        case 'accepted': return 'bg-neo-lime';
        case 'rejected': return 'bg-neo-red';
        case 'duplicate': return 'bg-neo-orange';
        case 'pending': return 'bg-neo-yellow';
        default: return 'bg-neo-cyan';
      }
    }
    return 'bg-neo-cyan';
  };

  // Get text color based on state
  const getTextColor = () => {
    if (showFeedback && visibleFeedback?.type === 'rejected') {
      return 'text-neo-cream';
    }
    return 'text-neo-black';
  };

  // Sparkle positions for accepted state
  const sparklePositions = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      angle: (i * 45) * (Math.PI / 180),
      delay: i * 0.04,
    })), []
  );

  // Show empty placeholder only if we have no content at all
  const showEmpty = !hasContent;

  return (
    <div
      className={containerClasses}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {showEmpty ? (
          /* Empty state - subtle placeholder */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={cn(
              'border-2 border-dashed border-neo-black/20 rounded-neo flex items-center justify-center',
              compact ? 'h-8 min-w-[80px] px-3' : 'h-10 min-w-[100px] px-4'
            )}
          >
            <span className={cn(
              'text-neo-black/30 font-medium',
              compact ? 'text-xs' : 'text-sm'
            )}>
              ···
            </span>
          </motion.div>
        ) : (
          /* Main content - morphs between forming and feedback states */
          <motion.div
            key="content"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: showFeedback && (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate')
                ? [-4, 4, -4, 4, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              layout: { type: 'spring', stiffness: 500, damping: 30 },
              opacity: { duration: 0.15 },
              scale: { type: 'spring', stiffness: 400, damping: 25 },
              x: { duration: 0.4 }
            }}
            className={cn(
              'relative border-3 border-neo-black rounded-neo shadow-hard flex items-center gap-2 whitespace-nowrap overflow-visible',
              compact ? 'px-3 py-1.5' : 'px-4 py-2',
              getBgColor()
            )}
          >
            {/* Status icon - only for feedback states */}
            <AnimatePresence mode="popLayout">
              {showFeedback && (
                <motion.span
                  key={`icon-${visibleFeedback?.type}`}
                  initial={{ scale: 0, rotate: visibleFeedback?.type === 'accepted' ? -180 : 0 }}
                  animate={{
                    scale: 1,
                    rotate: (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate')
                      ? [0, -15, 15, -15, 0] : 0
                  }}
                  exit={{ scale: 0 }}
                  transition={{
                    default: { type: 'tween' },
                    scale: { type: 'spring', stiffness: 500, damping: 25 },
                    rotate: { type: 'tween', duration: 0.4, ease: 'easeInOut' }
                  }}
                  className={cn(
                    'font-black',
                    compact ? 'text-base' : 'text-lg',
                    getTextColor()
                  )}
                >
                  {visibleFeedback?.type === 'accepted' && '✓'}
                  {visibleFeedback?.type === 'rejected' && '✗'}
                  {visibleFeedback?.type === 'duplicate' && '⟳'}
                  {visibleFeedback?.type === 'pending' && (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Word display - morphs content */}
            <motion.span
              layout
              className={cn(
                'font-black uppercase tracking-wide',
                compact ? 'text-base' : 'text-xl',
                getTextColor()
              )}
            >
              {showFeedback && visibleFeedback?.type === 'rejected'
                ? (visibleFeedback.message || 'Invalid')
                : showFeedback && visibleFeedback?.type === 'duplicate'
                  ? (visibleFeedback.message || 'Already found')
                  : displayWord}
            </motion.span>

            {/* Letter count - only when forming */}
            <AnimatePresence mode="popLayout">
              {showForming && (
                <motion.span
                  key="letter-count"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={cn(
                    'font-bold bg-neo-black/15 rounded-md',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
                    getTextColor()
                  )}
                >
                  {displayLetterCount}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Score badge - for accepted feedback */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.score !== undefined && (
                <motion.span
                  key="score"
                  initial={{ scale: 0, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                  className={cn(
                    'bg-neo-cyan text-neo-black font-black rounded-neo border-2 border-neo-black',
                    compact ? 'text-sm px-2 py-0.5' : 'text-base px-2.5 py-1'
                  )}
                >
                  +{visibleFeedback.score}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Fire round bonus indicator */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.fireRoundActive && (
                <motion.span
                  key="fire"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                  className={cn(
                    'bg-gradient-to-r from-orange-500 to-red-500 text-white font-black rounded-md border-2 border-neo-black',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'
                  )}
                >
                  {visibleFeedback.fireRoundBonus ? `🔥+${visibleFeedback.fireRoundBonus}` : '🔥2x'}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Sparkle particles - for accepted */}
            {showFeedback && visibleFeedback?.type === 'accepted' && sparklePositions.map((pos, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 bg-neo-yellow rounded-full"
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.2, 0],
                  x: [0, Math.cos(pos.angle) * 35],
                  y: [0, Math.sin(pos.angle) * 35],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.5, delay: pos.delay }}
                style={{ left: '50%', top: '50%' }}
              />
            ))}

            {/* Burst ring - for accepted */}
            {showFeedback && visibleFeedback?.type === 'accepted' && (
              <motion.div
                className="absolute inset-0 rounded-neo pointer-events-none"
                initial={{ scale: 0.8, opacity: 1 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{ border: '3px solid var(--neo-lime)' }}
              />
            )}

            {/* Red pulse - for rejected */}
            {showFeedback && visibleFeedback?.type === 'rejected' && (
              <motion.div
                className="absolute inset-0 rounded-neo pointer-events-none bg-red-500/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.4 }}
              />
            )}

            {/* Orange pulse - for duplicate */}
            {showFeedback && visibleFeedback?.type === 'duplicate' && (
              <motion.div
                className="absolute inset-0 rounded-neo pointer-events-none bg-orange-500/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.3] }}
                transition={{ duration: 0.4 }}
              />
            )}

            {/* Pulsing glow - for pending */}
            {showFeedback && visibleFeedback?.type === 'pending' && (
              <motion.div
                className="absolute inset-0 rounded-neo pointer-events-none"
                animate={{
                  boxShadow: [
                    '0 0 8px rgba(255, 225, 53, 0.4)',
                    '0 0 16px rgba(255, 225, 53, 0.6)',
                    '0 0 8px rgba(255, 225, 53, 0.4)',
                  ],
                }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

WordFormingArea.displayName = 'WordFormingArea';

export default WordFormingArea;
