/**
 * StudentNextActions — post-game CTA for students in classroom mode.
 *
 * Primary: "Play Again" — re-launch the same mode+settings (via onPlayAgain callback).
 * Or, in a teacher-paced room (no launcher): "you're still in — stay here" as
 * the loud primary, because the next game reaches this phone on its own.
 * Tertiary: "Practice Missed Words" escape hatch for productive downtime.
 *
 * Never lands a student on a paywall (/education/access) or outside the
 * education tree. The play-again intent is passed from the lobby piece
 * (quickLaunchIntent or replay logic).
 */

'use client';

import { m } from 'framer-motion';
import { RotateCcw, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackResultsAction } from './trackResultsAction';

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
          onClick={() => {
            trackResultsAction('play_again', 'student');
            onPlayAgain();
          }}
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

      {/* No launcher in a teacher-paced room: the next game arrives on this
          phone by itself. So "you're still in, stay here" IS the primary — a
          solid fill a student reads at a glance, not a faint hint. Static (no
          entrance tween, no spinner): a spinning clock reads as "broken". */}
      {!onPlayAgain && (
        <div
          data-testid="wait-for-teacher-message"
          role="status"
          aria-live="polite"
          className={cn(
            'w-full px-4 py-3.5 rounded-neo border-[3px] border-neo-black shadow-hard',
            'bg-neo-lime text-neo-black flex items-center gap-3'
          )}
        >
          <span className="relative flex w-3.5 h-3.5 shrink-0" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-neo-black/40 animate-ping motion-reduce:animate-none" />
            <span className="relative w-3.5 h-3.5 rounded-full bg-neo-black" />
          </span>
          <span className="min-w-0">
            <span className="block font-neo-display font-bold text-base leading-snug">
              {t('education.results.waitingForTeacher')}
            </span>
            <span className="block font-neo-body font-bold text-sm leading-snug text-neo-black/75">
              {t('education.results.stayInClass')}
            </span>
          </span>
        </div>
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
          onClick={() => {
            trackResultsAction('practice', 'student');
            onPractice();
          }}
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
