'use client';

import { Target } from 'lucide-react';
import { Pop } from '@/components/education/motion/Pop';
import { cn } from '@/lib/utils';
import { targetsToSlots, type LessonTarget } from './lessonTargets';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface LessonTargetStripProps {
  targets: LessonTarget[];
  t: T;
  dir: 'ltr' | 'rtl';
  className?: string;
}

/** Dark-only surface, so colours are fixed against navy rather than a cream/dark pair. */
export function LessonTargetStrip({ targets, t, dir, className }: LessonTargetStripProps) {
  const slots = targetsToSlots(targets);
  const done = slots.filter((s) => s.state !== 'hidden').length;

  return (
    <div
      data-testid="lesson-target-strip"
      dir={dir}
      className={cn(
        'pointer-events-none fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-lg rounded-t-neo border-3 border-b-0 border-neo-cream bg-neo-navy px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] text-neo-cream shadow-hard',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cyan">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          <Pop pulseKey={done}>{t('education.wordBank.huntTitle', { found: done, total: slots.length })}</Pop>
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {slots.map((slot) => (
            <li
              key={slot.key}
              data-found={slot.state === 'mine' ? 'true' : 'false'}
              data-state={slot.state}
              aria-label={slot.state === 'hidden' ? t('education.wordBank.huntHidden', { length: slot.rest + 1 }) : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black px-1.5 py-0.5 font-neo-display text-sm font-black uppercase leading-none shadow-hard-sm',
                slot.state === 'hidden' ? 'bg-neo-cream text-neo-black' : 'bg-neo-lime text-neo-black',
              )}
            >
              {slot.state === 'hidden' ? (
                <span aria-hidden="true">
                  {slot.first}
                  <span className="ms-0.5 tracking-[0.15em] text-neo-black/45">{'·'.repeat(slot.rest)}</span>
                </span>
              ) : (
                <Pop pulseKey={`${slot.key}:${slot.state}`}>
                  <span dir="auto">{slot.word}</span>
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
