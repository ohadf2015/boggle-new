'use client';

import { Target } from 'lucide-react';
import { Pop } from '@/components/education/motion/Pop';
import { cn } from '@/lib/utils';
import { targetsToSlots, type LessonTarget, type StripSlot } from './lessonTargets';

type T = (key: string, params?: Record<string, string | number>) => string;

export type LessonTargetStripProps = {
  t: T;
  dir: 'ltr' | 'rtl';
  className?: string;
  /** In its row under the grid instead of pinned to the screen bottom; one line, so the row never grows. */
  inline?: boolean;
} & (
  | { targets: LessonTarget[]; slots?: never; race?: never }
  | { slots: StripSlot[]; race?: boolean; targets?: never }
);

const CHIP_BY_STATE: Record<StripSlot['state'], string> = {
  hidden: 'bg-neo-cream text-neo-black',
  mine: 'bg-neo-lime text-neo-black',
  taken: 'bg-neo-pink text-neo-black',
};

function chipLabel(slot: StripSlot, t: T): string | undefined {
  if (slot.state === 'taken') return t('education.race.takenBy', { word: slot.word ?? '', name: slot.by ?? '' });
  if (slot.state === 'mine') return undefined;
  return t('education.wordBank.huntHidden', { length: slot.rest + 1 });
}

/** Dark-only surface, so colours are fixed against navy rather than a cream/dark pair. */
export function LessonTargetStrip(props: LessonTargetStripProps) {
  const { t, dir, className, inline } = props;
  const all = props.targets ? targetsToSlots(props.targets) : (props.slots ?? []);
  const race = !props.targets && !!props.race;
  const done = all.filter((s) => s.state !== 'hidden').length;
  // One line under the grid holds only a few chips: the words still to grab are the clue, so they go first.
  const compact = inline && race;
  const slots = compact ? [...all.filter((s) => s.state === 'hidden'), ...all.filter((s) => s.state !== 'hidden')] : all;
  const title = race
    ? t('education.race.claimedCount', { claimed: done, total: slots.length })
    : t('education.wordBank.huntTitle', { found: done, total: slots.length });

  return (
    <div
      data-testid="lesson-target-strip"
      data-race={race ? 'true' : undefined}
      dir={dir}
      className={cn(
        'pointer-events-none bg-neo-navy text-white',
        inline
          ? 'min-w-0 overflow-hidden rounded-neo border-2 border-neo-cream/40 px-2 py-1 shadow-hard-sm'
          : 'fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-lg border-3 border-b-0 border-neo-cream rounded-t-neo shadow-hard px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cyan">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          {compact ? (
            <Pop pulseKey={done}>
              <span data-testid="lesson-target-count" aria-hidden="true" dir="ltr" className="tabular-nums">{`${done}/${slots.length}`}</span>
              <span className="sr-only">{title}</span>
            </Pop>
          ) : (
            <Pop pulseKey={done}>{title}</Pop>
          )}
        </span>
        <ul
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1',
            !inline && 'flex-wrap',
            inline && !compact && 'flex-nowrap overflow-hidden',
            compact && 'pointer-events-auto flex-nowrap overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {slots.map((slot) => (
            <li
              key={slot.key}
              data-found={slot.state === 'mine' ? 'true' : 'false'}
              data-state={slot.state}
              aria-label={chipLabel(slot, t)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black px-1.5 py-0.5 font-neo-display font-black uppercase leading-none shadow-hard-sm',
                compact ? 'text-xs' : 'text-sm',
                CHIP_BY_STATE[slot.state],
              )}
            >
              {slot.state === 'hidden' ? (
                <span aria-hidden="true">
                  {slot.first}
                  <span className={cn('ms-0.5 text-neo-black/45', compact ? 'tracking-[0.05em]' : 'tracking-[0.15em]')}>{'·'.repeat(slot.rest)}</span>
                </span>
              ) : (
                <Pop pulseKey={`${slot.key}:${slot.state}`}>
                  <span className="flex items-center gap-1" aria-hidden={slot.state === 'taken' ? 'true' : undefined}>
                    {slot.state === 'taken' && slot.avatar?.emoji && <span className="normal-case">{slot.avatar.emoji}</span>}
                    <span dir="auto" className={slot.state === 'taken' ? 'line-through decoration-2' : undefined}>{slot.word}</span>
                    {slot.state === 'taken' && slot.by && (
                      <span dir="auto" className="max-w-[5rem] truncate font-neo-body text-[10px] font-bold normal-case">{slot.by}</span>
                    )}
                  </span>
                </Pop>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LessonTargetStrip;
