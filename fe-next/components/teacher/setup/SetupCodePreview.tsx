'use client';

import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const SLOTS = 6;

/** What students will see: the class name as it is typed, over the code's empty tiles, which fill in after Create. */
export function SetupCodePreview({ name, placeholder, t }: { name: string; placeholder: string; t: T }) {
  const typed = name.trim();
  return (
    <div
      data-testid="setup-code-preview"
      aria-hidden="true"
      className="flex items-center justify-between gap-3 rounded-neo-xl border-[3px] border-neo-black bg-neo-cream p-3 text-neo-black shadow-hard-lime-xl sm:p-4"
    >
      <div className="min-w-0">
        <p className="font-neo-body text-[0.7rem] font-black uppercase tracking-wide text-neo-black/60">{t('eduShell.setup.joinCode')}</p>
        <p dir="auto" className={cn('line-clamp-1 font-neo-display text-lg font-black leading-tight [overflow-wrap:anywhere] sm:line-clamp-2 sm:text-2xl', !typed && 'text-neo-black/40')}>
          {typed || placeholder}
        </p>
        <p className="mt-0.5 hidden font-neo-body text-xs font-bold text-neo-black/65 sm:block">{t('eduShell.setup.side.step2')}</p>
      </div>
      <div dir="ltr" className="flex shrink-0 gap-1">
        {Array.from({ length: SLOTS }, (_, i) => (
          <span
            key={i}
            data-testid="setup-code-placeholder"
            style={{ animationDelay: `${i * 90}ms` }}
            className={cn(
              'grid h-9 w-6 place-items-center rounded-neo border-2 border-dashed border-neo-black/60 font-neo-display text-base font-black text-neo-black/30 sm:h-12 sm:w-9 sm:text-xl',
              typed && 'border-solid bg-neo-white motion-safe:animate-pulse',
            )}
          >
            ?
          </span>
        ))}
      </div>
    </div>
  );
}

export default SetupCodePreview;
