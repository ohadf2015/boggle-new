'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const STEPS = ['eduShell.setup.strip.name', 'eduShell.setup.strip.share', 'eduShell.home.startLive'] as const;

/** Where the teacher is in getting a class going: name it, share the code, start a game. */
export function SetupStepStrip({ current, t }: { current: 0 | 1 | 2; t: T }) {
  return (
    <ol aria-label={t('eduShell.setup.title')} className="flex items-center gap-1.5 font-neo-body text-xs font-black sm:gap-2 sm:text-sm">
      {STEPS.map((key, i) => {
        const on = i === current;
        const done = i < current;
        return (
          <Fragment key={key}>
            {i > 0 ? <li aria-hidden="true" className={cn('h-[3px] min-w-3 flex-1 rounded-full', done || on ? 'bg-neo-lime' : 'bg-neo-cream/25')} /> : null}
            <li data-testid="setup-step" aria-current={on ? 'step' : undefined} className={cn('flex min-w-0 shrink-0 items-center gap-1.5', on ? 'text-neo-cream' : 'text-neo-cream/60')}>
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border-2 font-neo-display text-xs font-black',
                  on ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard' : done ? 'border-neo-lime text-neo-lime' : 'border-neo-cream/40',
                )}
              >
                {i + 1}
              </span>
              <span className={cn('truncate', !on && 'max-sm:sr-only')}>{t(key)}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

export default SetupStepStrip;
