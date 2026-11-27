'use client';

import { cn } from '@/lib/utils';
import { Pop } from '@/components/education/motion/Pop';

type T = (key: string, params?: Record<string, string | number>) => string;

const SLOTS = 6;

/** What students will see: the class name as it is typed, over the code's empty tiles, which fill in after Create. */
export function SetupCodePreview({ name, t }: { name: string; t: T }) {
  const typed = name.trim();
  return (
    <div
      data-testid="setup-code-preview"
      aria-hidden="true"
      className="edu-card flex items-center justify-between gap-3 p-4 sm:gap-6 sm:p-5"
    >
      <div className="min-w-0">
        <p className="font-neo-body text-xs font-black uppercase tracking-wide text-edu-ink/75 sm:text-sm">{t('eduShell.setup.joinCode')}</p>
        <p dir="auto" className={cn('line-clamp-1 font-neo-display text-xl font-black leading-tight [overflow-wrap:anywhere] sm:line-clamp-2 sm:text-3xl', !typed && 'text-edu-ink/45')}>
          {typed || t('eduShell.setup.codePending')}
        </p>
        <p className="mt-1 hidden font-neo-body text-sm font-bold text-edu-ink/80 sm:block">{t('eduShell.setup.side.step2')}</p>
      </div>
      <Pop pulseKey={typed ? typed.length : 0} className="shrink-0">
        <div dir="ltr" className="flex gap-1 sm:gap-2">
          {Array.from({ length: SLOTS }, (_, i) => (
            <span
              key={i}
              data-testid="setup-code-placeholder"
              className={cn(
                'grid h-10 w-7 place-items-center rounded-neo-lg border-[3px] border-dashed border-edu-line/60 font-neo-display text-lg font-black text-edu-ink/40 transition-[background-color] duration-150 motion-reduce:transition-none sm:h-16 sm:w-12 sm:text-3xl',
                typed && 'border-solid border-neo-black bg-edu-tile text-neo-black/40 shadow-edu-lip-sm',
              )}
            >
              ?
            </span>
          ))}
        </div>
      </Pop>
    </div>
  );
}

export default SetupCodePreview;
