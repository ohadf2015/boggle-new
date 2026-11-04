'use client';

import { Hash, Play, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassroomGuestDemoNextStepsProps {
  t: (key: string) => string;
  ready: boolean;
}

const STEPS = [
  { key: 'joinByCode.stepCode', Icon: Hash },
  { key: 'joinByCode.stepName', Icon: UserRound },
  { key: 'joinByCode.stepPlay', Icon: Play },
] as const;

/** A three-node path so the join screen shows where the code leads, not only an input. */
export function ClassroomGuestDemoNextSteps({ t, ready }: ClassroomGuestDemoNextStepsProps) {
  const progress = ready ? 1 : 0;
  return (
    <nav aria-label={t('joinByCode.stepsLabel')} className="w-full">
      <ol data-testid="guest-join-steps" className="relative flex items-start justify-between">
        <span aria-hidden="true" className="absolute inset-x-[16.67%] top-[1.125rem] h-2 rounded-full bg-neo-black sm:top-5" />
        <span
          aria-hidden="true"
          data-testid="guest-join-steps-fill"
          data-progress={String(progress)}
          style={{ width: `${progress * 33.33}%` }}
          className="absolute start-[16.67%] top-[1.125rem] h-2 rounded-full bg-neo-lime transition-[width] duration-300 ease-out motion-reduce:transition-none sm:top-5"
        />
        {STEPS.map((step, i) => {
          const current = i === 0;
          const lit = current || (ready && i === 1);
          return (
            <li key={step.key} aria-current={current ? 'step' : undefined} className="relative flex w-1/3 flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-11 items-center justify-center rounded-full border-[3px] transition-[background-color,color,border-color] duration-200 motion-reduce:transition-none sm:size-12',
                  current && 'border-neo-black bg-neo-lime text-neo-black shadow-[0_3px_0_0] shadow-neo-lime-dark',
                  !current && lit && 'border-neo-black bg-neo-cyan text-neo-black shadow-[0_3px_0_0] shadow-neo-cyan-dark',
                  !lit && 'border-neo-black bg-neo-navy text-neo-cream/70 shadow-[0_3px_0_0] shadow-neo-black',
                )}
              >
                <step.Icon className="size-5" strokeWidth={3} />
              </span>
              <span className={cn('font-neo-display text-sm font-black uppercase tracking-[0.06em] sm:text-base', lit ? 'text-neo-cream' : 'text-neo-cream/70')}>{t(step.key)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
