/**
 * AttemptHistory Component
 * Immersive Wordle-style attempt history with staggered flip animations,
 * proximity heatmap coloring, and interactive tile tap feedback.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { WordHuntResult } from '@/utils/dailyChallenge';

export interface AttemptHistoryProps {
  attempts: WordHuntResult['attempts'];
  attemptsUsed: number;
  t: (key: string) => string;
}

const FEEDBACK_COLORS = {
  green: {
    bg: 'bg-neo-lime',
    border: 'border-neo-lime-light',
    glow: 'shadow-[0_0_8px_rgba(191,255,0,0.4)]',
    text: 'text-neo-black',
  },
  yellow: {
    bg: 'bg-neo-cyan-muted',
    border: 'border-neo-cyan',
    glow: 'shadow-[0_0_8px_rgba(0,255,255,0.3)]',
    text: 'text-neo-black',
  },
  gray: {
    bg: 'bg-neo-navy-light',
    border: 'border-neo-cream/20',
    glow: '',
    text: 'text-neo-white',
  },
} as const;

/** Get attempt label badge based on row index */
function getAttemptBadge(idx: number, total: number, isCorrect: boolean): { emoji: string; color: string } | null {
  if (isCorrect) {
    if (idx === 0) return { emoji: '🧠', color: 'text-neo-lime' };
    if (idx <= 2) return { emoji: '⚡', color: 'text-neo-cyan' };
    if (idx <= 4) return { emoji: '💪', color: 'text-neo-lime' };
    if (idx >= total - 1) return { emoji: '😅', color: 'text-neo-pink' };
  }
  return null;
}

export const AttemptHistory: React.FC<AttemptHistoryProps> = ({
  attempts,
  attemptsUsed,
  t,
}) => {
  const [tappedTile, setTappedTile] = useState<string | null>(null);

  const handleTileTap = useCallback((id: string) => {
    setTappedTile(id);
    setTimeout(() => setTappedTile(null), 600);
  }, []);

  if (!attempts || attempts.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-neo-cyan rounded-full" />
          <h3 className="text-sm font-black text-neo-white uppercase tracking-wider">
            {t('wordHunt.title')}
          </h3>
        </div>
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
          className="px-2.5 py-0.5 bg-neo-cyan/20 border border-neo-cyan/40 rounded-full"
        >
          <span className="text-xs font-black text-neo-cyan tabular-nums">
            {attemptsUsed} {t('common.attempts')}
          </span>
        </m.div>
      </div>

      {/* Attempt grid */}
      <div className="relative bg-neo-navy-light/60 rounded-neo border-2 border-neo-black p-3 space-y-1.5 overflow-hidden">
        {/* Subtle grid background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {attempts.map((attempt, rowIdx) => {
          const isCorrectRow = attempt.feedback?.every((f) => f.feedback === 'green') ?? false;
          const greenCount = attempt.feedback?.filter((f) => f.feedback === 'green').length ?? 0;
          const badge = getAttemptBadge(rowIdx, attemptsUsed, isCorrectRow);

          return (
            <m.div
              key={rowIdx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: rowIdx * 0.1,
                type: 'spring',
                stiffness: 300,
                damping: 22,
              }}
              className={cn(
                "relative flex items-center justify-center gap-1.5 py-1 rounded-md transition-colors",
                isCorrectRow && "bg-neo-lime/10"
              )}
            >
              {/* Row number */}
              <span className={cn(
                "text-[11px] font-bold w-5 text-right tabular-nums",
                isCorrectRow ? "text-neo-lime" : "text-neo-white"
              )}>
                {rowIdx + 1}
              </span>

              {/* Letter tiles */}
              <div className="flex gap-1">
                {attempt.feedback.map((letterFb, letterIdx) => {
                  const tileId = `${rowIdx}-${letterIdx}`;
                  const isTapped = tappedTile === tileId;
                  const colors = FEEDBACK_COLORS[letterFb.feedback as keyof typeof FEEDBACK_COLORS] || FEEDBACK_COLORS.gray;

                  return (
                    <m.button
                      key={letterIdx}
                      initial={{ scale: 0, rotateX: -180 }}
                      animate={{
                        scale: isTapped ? [1, 1.2, 1] : 1,
                        rotateX: 0,
                      }}
                      transition={{
                        delay: rowIdx * 0.1 + letterIdx * 0.06,
                        type: isTapped ? 'tween' : 'spring',
                        stiffness: 500,
                        damping: 25,
                      }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleTileTap(tileId)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center font-black text-sm rounded-[4px] border-2 transition-shadow cursor-pointer select-none",
                        colors.bg,
                        colors.border,
                        colors.text,
                        letterFb.feedback !== 'gray' && colors.glow
                      )}
                      style={{ perspective: '400px' }}
                    >
                      {letterFb.letter}
                    </m.button>
                  );
                })}
              </div>

              {/* Green count indicator */}
              {!isCorrectRow && greenCount > 0 && (
                <m.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: rowIdx * 0.1 + 0.4 }}
                  className="text-[10px] font-bold text-neo-lime/70 w-5"
                >
                  {greenCount}✓
                </m.span>
              )}

              {/* Correct row badge */}
              {badge && (
                <m.span
                  initial={{ opacity: 0, scale: 0, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{
                    delay: rowIdx * 0.1 + 0.5,
                    type: 'spring',
                    stiffness: 400,
                    damping: 10,
                  }}
                  className={cn("text-sm w-5", badge.color)}
                >
                  {badge.emoji}
                </m.span>
              )}

              {/* Non-badge spacer for alignment */}
              {!badge && !(!isCorrectRow && greenCount > 0) && (
                <span className="w-5" />
              )}
            </m.div>
          );
        })}
      </div>
    </div>
  );
};

export default AttemptHistory;
