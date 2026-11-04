/** One compact row while the clock runs so the answers keep the height; the verdict sheet takes the slot at its own height. */

'use client';

import type { ReactNode } from 'react';
import { Check, Flame, Hourglass, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { Pop } from '@/components/education/motion';

export interface VocabQuizFooterBarProps {
  /** The verdict sheet; when set it replaces the footer content in place. */
  verdict?: ReactNode;
  /** This student has committed an answer and is waiting on the room. */
  locked: boolean;
  /** How many classmates have committed on this question, if known. */
  lockedIn?: { locked: number; total: number } | null;
  /** The student's live streak going into this question. */
  streak?: number;
  /** The word this student locked in, echoed back while the room answers. */
  picked?: string | null;
  /** The clock ran out before this student answered. */
  timeUp?: boolean;
  t: TranslateFn;
}

const HEADLINE = 'flex min-w-0 items-center gap-2 text-balance break-words font-neo-display text-base font-black leading-tight text-neo-white sm:text-xl';
const HINT = 'flex min-w-0 items-center gap-2 text-balance break-words font-neo-body text-sm font-bold leading-tight text-neo-white/70 sm:text-lg';
const HEAD_ICON = 'size-5 shrink-0 sm:size-6';

const MAX_ROOM_DOTS = 12;

function RoomChip({ room, t }: { room: { locked: number; total: number }; t: TranslateFn }) {
  const dots = room.total <= MAX_ROOM_DOTS ? Array.from({ length: room.total }, (_, i) => i < room.locked) : [];
  return (
    <span
      data-testid="vocab-quiz-footer-room"
      className="ms-auto flex shrink-0 items-center gap-2 whitespace-nowrap font-neo-display font-black tabular-nums text-neo-white"
    >
      <span className="sr-only">{t('vocabQuiz.footer.roomCount', { locked: room.locked, total: room.total })}</span>
      {dots.length > 0 ? (
        <span aria-hidden className={cn('grid grid-flow-col gap-1 sm:gap-1.5', dots.length > 6 ? 'grid-rows-2' : 'grid-rows-1')}>
          {dots.map((on, i) => (
            <span
              key={i}
              data-dot={on ? 'on' : 'off'}
              className={cn(
                'size-3.5 rounded-full border-2 transition-[transform,background-color] duration-200 motion-reduce:transition-none sm:size-4',
                on ? 'scale-100 border-neo-black bg-neo-lime' : 'scale-90 border-neo-white/40 bg-transparent'
              )}
            />
          ))}
        </span>
      ) : (
        <Users className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
      <span aria-hidden data-testid="vocab-quiz-footer-room-count" className="text-lg leading-none sm:text-xl">
        {room.locked}/{room.total}
      </span>
    </span>
  );
}

export function VocabQuizFooterBar({
  verdict,
  locked,
  lockedIn = null,
  streak = 0,
  picked = null,
  timeUp = false,
  t,
}: VocabQuizFooterBarProps) {
  const room = lockedIn && lockedIn.total > 0 ? lockedIn : null;
  const live = streak >= 1;
  const status = locked ? (
    <>
      <Pop className="min-w-0 max-w-full">
        <span role="status" data-testid="vocab-quiz-footer-status" className={HEADLINE}>
          <Check className={`${HEAD_ICON} text-neo-lime`} strokeWidth={3.5} aria-hidden />
          <span>{t('vocabQuiz.footer.locked')}</span>
        </span>
      </Pop>
      {picked && (
        <span data-testid="vocab-quiz-footer-picked" className="break-words font-neo-body text-sm font-bold leading-snug text-neo-white/70 sm:text-base">
          {t('vocabQuiz.footer.youPicked', { word: picked })}
        </span>
      )}
    </>
  ) : timeUp ? (
    <p role="status" data-testid="vocab-quiz-footer-timeup" className={HEADLINE}>
      <Hourglass className={`${HEAD_ICON} text-neo-orange`} strokeWidth={3} aria-hidden />
      <span>{t('vocabQuiz.footer.timeUp')}</span>
    </p>
  ) : null;

  return (
    <div
      data-testid="vocab-quiz-footer"
      // Bleeds past the shell's p-3 so the verdict sheet owns the bottom edge, like a lesson's feedback bar.
      className={cn('-mx-3 -mb-3 shrink-0', verdict && 'h-[calc(12rem+env(safe-area-inset-bottom))] overflow-hidden sm:h-40 sm:[@media(max-height:560px)]:h-28')}
    >
      {verdict ?? (
        <div data-testid="vocab-quiz-footer-gutters" className="flex px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:border-t-2 sm:border-neo-white/10 sm:pt-4 [@media(max-height:560px)]:pt-1 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            data-testid="vocab-quiz-footer-row"
            // Physical left on phones: the corner a floating launcher or dev badge takes, in either direction.
            className="mx-auto flex min-h-12 w-full max-w-[720px] items-center gap-x-3 max-sm:pl-12"
          >
            <div data-testid="vocab-quiz-footer-text" className="flex min-w-0 flex-[1_1_auto] flex-col gap-0.5">
              {status ?? (live ? (
                // Keyed on the count so each new right answer re-pops the run.
                <Pop key={streak} className="min-w-0 max-w-full">
                  <p data-testid="vocab-quiz-footer-hint" data-live="true" className={HINT}>
                    <Flame className={`${HEAD_ICON} fill-neo-orange text-neo-orange`} strokeWidth={3} aria-hidden />
                    <span>{t('vocabQuiz.footer.streakRun', { count: streak })}</span>
                  </p>
                </Pop>
              ) : (
                <p data-testid="vocab-quiz-footer-hint" data-live="false" className={HINT}>
                  <Zap className={`${HEAD_ICON} fill-neo-lime text-neo-lime`} strokeWidth={3} aria-hidden />
                  <span>{t('vocabQuiz.footer.speedTip')}</span>
                </p>
              ))}
            </div>
            {room && <RoomChip room={room} t={t} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabQuizFooterBar;
