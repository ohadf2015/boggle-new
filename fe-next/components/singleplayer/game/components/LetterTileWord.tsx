'use client';

import React from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import { cn } from '@/lib/utils';

interface LetterTileWordProps {
  /** The word being formed */
  word: string;
  /** Feedback state for the word */
  feedback: WordFeedback | null;
  /** Maximum tiles to show */
  maxTiles?: number;
}

// Feedback icon mapping
const FEEDBACK_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  accepted: { icon: Check, color: 'text-neo-lime' },
  rejected: { icon: X, color: 'text-white' },
  duplicate: { icon: RotateCcw, color: 'text-white' },
};

/**
 * LetterTileWord - Displays formed word as individual letter tiles with feedback indicators
 * Shows icons, messages, score badges, and shake animations based on feedback state
 */
export function LetterTileWord({
  word,
  feedback,
  maxTiles = 8,
}: LetterTileWordProps): React.ReactElement {
  const letters = word.toUpperCase().split('').slice(0, maxTiles);

  const getTileStyle = () => {
    if (!feedback) {
      return 'bg-neo-navy border-neo-black text-white';
    }
    switch (feedback.type) {
      case 'accepted':
        return 'bg-neo-lime border-neo-black text-neo-black';
      case 'rejected':
        return 'bg-neo-red border-neo-black text-white';
      case 'duplicate':
        return 'bg-pink-500 border-neo-black text-white';
      default:
        return 'bg-neo-navy border-neo-black text-white';
    }
  };

  const shouldShake = feedback?.type === 'rejected' || feedback?.type === 'duplicate';

  // Empty state
  if (letters.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center">
        <span className="text-white/60 font-bold text-sm uppercase tracking-wide">
          {/* Empty - waiting for word */}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="tile-container"
      className={cn(
        'relative flex items-center justify-center',
        shouldShake && 'animate-neo-shake'
      )}
    >
      {/* Letter tiles - always centered */}
      <div className="flex items-center gap-1">
        {letters.map((letter, index) => (
          <AdaptiveMotion.div
            key={`${letter}-${index}`}
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 25,
              delay: index * 0.03,
            }}
            className={cn(
              'w-10 h-12 flex items-center justify-center',
              'rounded-neo border-3 shadow-hard-sm',
              'font-black text-xl uppercase',
              getTileStyle()
            )}
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {letter}
          </AdaptiveMotion.div>
        ))}
      </div>

      {/* Feedback badge - absolutely positioned to the side, doesn't shift tiles */}
      <AdaptiveAnimatePresence>
        {feedback && (
          <AdaptiveMotion.div
            data-testid="feedback-row"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-1/2 -translate-y-1/2 start-full ms-2 flex items-center gap-1"
          >
            {/* Feedback icon */}
            {FEEDBACK_ICONS[feedback.type] && (() => {
              const { icon: Icon, color } = FEEDBACK_ICONS[feedback.type];
              return (
                <span data-testid={`feedback-icon-${feedback.type}`}>
                  <Icon className={cn('w-5 h-5', color)} />
                </span>
              );
            })()}

            {/* Score badge for accepted */}
            {feedback.type === 'accepted' && feedback.score != null && (
              <AdaptiveMotion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="font-black text-neo-lime text-base"
              >
                +{feedback.score}
              </AdaptiveMotion.span>
            )}

            {/* Message for rejected/duplicate */}
            {(feedback.type === 'rejected' || feedback.type === 'duplicate') && feedback.message && (
              <span className="font-bold text-white/80 text-[10px] uppercase tracking-wide max-w-[80px] leading-tight">
                {feedback.message}
              </span>
            )}
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default LetterTileWord;
