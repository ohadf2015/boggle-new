'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface WordFeedback {
  id: string;
  type: 'accepted' | 'rejected' | 'pending' | 'duplicate';
  word: string;
  score?: number;
  message?: string;
  fireRoundActive?: boolean;
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
 * Shows the word being formed, then smoothly transitions to show accept/reject/duplicate feedback
 * Feedback persists until replaced by new feedback or user starts forming a new word
 */
const WordFormingArea: React.FC<WordFormingAreaProps> = ({
  word,
  letterCount,
  className,
  compact = false,
  feedback,
}) => {
  const [visibleFeedback, setVisibleFeedback] = useState<WordFeedback | null>(null);
  const isForming = word.length > 0;

  // Handle feedback display - persists until replaced or user starts forming new word
  useEffect(() => {
    if (feedback) {
      setVisibleFeedback(feedback);
    }
  }, [feedback]);

  // Clear feedback when user starts forming a new word
  useEffect(() => {
    if (isForming && visibleFeedback) {
      setVisibleFeedback(null);
    }
  }, [isForming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine what to show: feedback takes priority over forming word
  const showFeedback = visibleFeedback !== null;
  const showForming = isForming && !showFeedback;
  const showEmpty = !showFeedback && !showForming;

  // Get display word - either forming or from feedback
  const displayWord = showFeedback ? visibleFeedback?.word : word;

  // Container size classes - LARGER sizes
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

  return (
    <div
      className={containerClasses}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {/* Main content container - stays visible, just changes appearance */}
        {(showForming || showFeedback) && (
          <motion.div
            key={showFeedback ? `feedback-${visibleFeedback?.id}` : 'forming'}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: showFeedback && (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate')
                ? [-4, 4, -4, 4, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.4 }
            }}
            className={cn(
              'relative border-3 border-neo-black rounded-neo shadow-hard flex items-center gap-2 whitespace-nowrap overflow-visible',
              compact ? 'px-3 py-1.5' : 'px-4 py-2',
              getBgColor()
            )}
          >
            {/* Status icon - only for feedback states */}
            {showFeedback && (
              <motion.span
                initial={{ scale: 0, rotate: visibleFeedback?.type === 'accepted' ? -180 : 0 }}
                animate={{
                  scale: [0, 1.4, 1],
                  rotate: (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate')
                    ? [0, -15, 15, -15, 0] : 0
                }}
                transition={{ duration: 0.4, times: [0, 0.5, 1] }}
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

            {/* Word display - LARGER text */}
            <motion.span
              key={displayWord}
              initial={showFeedback ? { x: -5 } : { scale: 0.9 }}
              animate={{ x: 0, scale: 1 }}
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
            {showForming && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'font-bold bg-neo-black/15 rounded-md',
                  compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
                  getTextColor()
                )}
              >
                {letterCount}
              </motion.span>
            )}

            {/* Score badge - for accepted feedback */}
            {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.score !== undefined && (
              <motion.span
                initial={{ scale: 0, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                className={cn(
                  'bg-neo-cyan text-neo-black font-black rounded-neo border-2 border-neo-black',
                  compact ? 'text-sm px-2 py-0.5' : 'text-base px-2.5 py-1'
                )}
              >
                +{visibleFeedback.score}
              </motion.span>
            )}

            {/* Fire round indicator */}
            {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.fireRoundActive && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'bg-gradient-to-r from-orange-500 to-red-500 text-white font-black rounded-md border-2 border-neo-black',
                  compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'
                )}
              >
                2x
              </motion.span>
            )}

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

        {/* Empty state - subtle placeholder */}
        {showEmpty && (
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordFormingArea;
