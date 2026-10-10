'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { liveSlots, type LessonStep, type SlotState } from '@/lib/tutorial/lesson/lessonEngine';
import s from './lesson.module.css';

export interface LessonTargetProps {
  step: LessonStep;
  target: string | null;
  /** Tiles of the shown word, for test drivers and the capture rig. */
  path: ReadonlyArray<{ row: number; col: number }> | null;
  formedWord: string;
  /** Key of the latest miss, so the strip shakes once per miss. */
  oops: string | null;
}

const SLOT: Record<SlotState, string> = {
  ghost: 'border-dashed border-neo-cream/45 bg-white/5 text-neo-cream/55',
  empty: 'border-dashed border-neo-cream/35 bg-transparent text-transparent',
  match: cn('border-neo-black bg-neo-lime text-neo-black shadow-[3px_3px_0_#000]', s.popIn),
  filled: cn('border-neo-black bg-neo-cream text-neo-black shadow-[3px_3px_0_#000]', s.popIn),
  ready: cn('border-neo-black bg-neo-lime text-neo-black', s.readyGlow),
  miss: cn('border-neo-black bg-neo-pink text-neo-white shadow-[3px_3px_0_#000]', s.popIn),
};

/** The word to make, as tiles that fill in live while the player drags. */
export function LessonTarget({ step, target, path, formedWord, oops }: LessonTargetProps) {
  const { t } = useLanguage();
  const showWord = step.kind === 'trace' && !!target;
  const slots = liveSlots(step, showWord ? target : null, formedWord);
  const label = showWord
    ? t('firstLesson.trace')
    : step.minLength <= 3
      ? t('firstLesson.findAny')
      : t('firstLesson.findLength', { count: step.minLength });

  return (
    <div
      data-testid="lesson-target"
      data-step={step.id}
      data-word={showWord ? target : ''}
      data-path={JSON.stringify(showWord && path ? path.map((c) => [c.row, c.col]) : [])}
      className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border-[3px] border-neo-black bg-neo-navy-light px-3 py-1.5 shadow-[3px_3px_0_#000]"
    >
      <p key={step.id} className={cn(s.titleIn, 'min-w-0 flex-1 font-neo-display text-[15px] font-black uppercase leading-tight tracking-wide text-neo-cream')}>
        {label}
      </p>
      <div key={oops ?? 'steady'} dir="auto" className={cn('flex shrink-0 gap-1.5', oops && s.shake)} aria-live="polite">
        {slots.map((slot, i) => (
          <span
            key={`${i}-${slot.state}-${slot.char}`}
            data-slot-state={slot.state}
            className={cn(
              'grid place-items-center rounded-lg border-[3px] font-neo-display font-black uppercase leading-none',
              slots.length > 5 ? 'h-8 w-6 text-base' : 'h-9 w-8 text-lg',
              SLOT[slot.state],
            )}
          >
            {slot.char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default LessonTarget;
