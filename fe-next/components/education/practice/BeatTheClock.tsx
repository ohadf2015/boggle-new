'use client';

/**
 * BeatTheClock — optional time pressure for the two modes that had none.
 *
 * Solo Board and Flashcard were the only practice modes with no clock of any
 * kind. A student could sit on a board for nine minutes and the screen would
 * never once suggest that finishing mattered; the round only ended when they
 * chose to press Finish. That is fine as a study tool and hopeless as a game.
 *
 * Rather than force a timer on both, this is a chip the student flips. The
 * defaults encode which mode each one is:
 *   - **Solo Board: on.** It is a find-as-many-as-you-can board — the exact
 *     shape that a clock turns into a game.
 *   - **Flashcard: off.** Flashcards are a self-paced review; a clock on by
 *     default would break the one mode whose whole point is taking your time.
 *
 * The toggle is session state, deliberately not persisted. A remembered
 * preference here would be a second source of truth resolving after first
 * paint, and the chip would visibly flip a beat after the round opened
 * (recurring pitfall Class 1). The default is authoritative and paints once.
 *
 * The expiry callback is fired exactly once per run, guarded by a ref, so a
 * parent re-render on the tick that hits zero cannot end the round twice.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { Timer, TimerOff } from 'lucide-react';
import { beatTheClockSeconds } from '@/lib/education/practiceJuice';

export interface BeatTheClockProps {
  mode: 'solo_board' | 'flashcard';
  /** Deck/board size — Flashcard scales its clock off this. */
  wordCount: number;
  /** Whether the clock should start switched on. */
  defaultOn: boolean;
  /** False while the round is paused, finished, or not yet begun. */
  active: boolean;
  /** Fired once when the clock reaches zero. */
  onExpire: () => void;
  className?: string;
}

const URGENT_AT = 10;

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function BeatTheClock({
  mode,
  wordCount,
  defaultOn,
  active,
  onExpire,
  className,
}: BeatTheClockProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const total = beatTheClockSeconds(mode, wordCount);

  const [enabled, setEnabled] = useState(defaultOn);
  const [left, setLeft] = useState(total);
  const expiredRef = useRef(false);
  const urgentFiredRef = useRef(false);

  const handleToggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      // Switching on always starts a fresh run — half a clock is not a
      // challenge, and a clock that resumes mid-round is just confusing.
      if (next) {
        setLeft(total);
        expiredRef.current = false;
        urgentFiredRef.current = false;
      }
      return next;
    });
  }, [total]);

  useEffect(() => {
    if (!enabled || !active || left <= 0) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [enabled, active, left]);

  useEffect(() => {
    if (!enabled || !active) return;
    if (left <= URGENT_AT && left > 0 && !urgentFiredRef.current) {
      urgentFiredRef.current = true;
      playSound('timerUrgent', { requiresGameActive: false, volume: 0.45 });
    }
    if (left === 0 && !expiredRef.current) {
      expiredRef.current = true;
      playSound('drillComplete', { requiresGameActive: false, volume: 0.55 });
      onExpire();
    }
  }, [left, enabled, active, playSound, onExpire]);

  const urgent = enabled && left <= URGENT_AT;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;

  return (
    <div
      data-testid="beat-the-clock"
      data-enabled={enabled ? 'true' : 'false'}
      data-urgent={urgent ? 'true' : 'false'}
      className={cn('flex items-center gap-2', className)}
    >
      <button
        type="button"
        data-testid="beat-the-clock-toggle"
        onClick={handleToggle}
        aria-pressed={enabled}
        className={cn(
          'inline-flex min-h-[36px] items-center gap-1.5 rounded-neo border-[3px] px-2.5 py-1 font-neo-display text-xs font-black uppercase transition-colors',
          // ON is a filled pink control; OFF keeps the navy fill, so the cream
          // border is the only thing that can make it findable at all.
          enabled
            ? 'border-black bg-neo-pink text-black shadow-hard-sm'
            : 'border-neo-cream bg-neo-navy text-neo-cream'
        )}
      >
        {enabled ? (
          <Timer className="h-4 w-4" aria-hidden="true" />
        ) : (
          <TimerOff className="h-4 w-4" aria-hidden="true" />
        )}
        {t('student.practiceFun.beatTheClock')}
      </button>

      {enabled && (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            data-testid="beat-the-clock-time"
            className={cn(
              'font-neo-display text-base font-black tabular-nums leading-none',
              urgent ? 'text-neo-pink' : 'text-neo-white'
            )}
          >
            {formatClock(left)}
          </span>
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-neo border-[2px] border-black bg-black/40">
            <div
              className={cn(
                'h-full transition-[width] duration-1000 ease-linear',
                urgent ? 'bg-neo-pink' : 'bg-neo-cyan'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
