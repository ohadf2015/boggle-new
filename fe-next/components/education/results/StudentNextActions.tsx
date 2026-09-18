/**
 * StudentNextActions — post-game CTA for students in classroom mode.
 *
 * Primary: "Play Again" — re-launch the same mode+settings (via onPlayAgain callback).
 * Secondary: "Wait for Teacher" message when student is in a teacher-paced game.
 * Tertiary: "Practice Missed Words" escape hatch for productive downtime.
 *
 * Never lands a student on a paywall (/education/access) or outside the
 * education tree. The play-again intent is passed from the lobby piece
 * (quickLaunchIntent or replay logic).
 */

'use client';

import { m } from 'framer-motion';
import { RotateCcw, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudentNextActionsProps {
  /** Callback to re-launch the game (same mode+settings). */
  onPlayAgain?: () => void;
  /** Callback to start practice mode on missed words. */
  onPractice?: () => void;
  /** Translator function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StudentNextActions({ onPlayAgain, onPractice, t }: StudentNextActionsProps) {
  return (
    <div className="space-y-3">
      {/* Primary: Play Again — loud, full-width, lime color (neo-brutalist primary) */}
      {onPlayAgain && (
        <m.button
          type="button"
          data-testid="play-again-button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlayAgain}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3.5 font-neo-display font-bold',
            'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg transition-all hover:-translate-y-0.5'
          )}
        >
          <RotateCcw className="w-5 h-5 shrink-0" aria-hidden />
          {t('education.results.playAgain')}
        </m.button>
      )}

      {/* Secondary: Waiting for teacher — info message only when student can't play again */}
      {!onPlayAgain && (
        <m.div
          data-testid="wait-for-teacher-message"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 py-3 rounded-neo border-[2px] border-neo-lime bg-neo-lime/10 flex items-center gap-3"
        >
          <Clock className="w-5 h-5 text-neo-lime shrink-0 animate-spin" aria-hidden />
          <p className="text-neo-white font-neo-display font-bold text-sm leading-snug">
            {t('education.results.waitingForTeacher')}
          </p>
        </m.div>
      )}

      {/* Tertiary: practice if they want to stay productive while waiting */}
      {onPractice && (
        <m.button
          type="button"
          data-testid="practice-missed-button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPractice}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cyan/20 text-neo-cyan border-[2px] border-neo-cyan rounded-neo',
            'shadow-hard hover:shadow-hard-lg transition-all',
            'hover:bg-neo-cyan/30'
          )}
        >
          <BookOpen className="w-5 h-5 shrink-0" aria-hidden />
          {t('education.results.practiceMissed')}
        </m.button>
      )}
    </div>
  );
}
