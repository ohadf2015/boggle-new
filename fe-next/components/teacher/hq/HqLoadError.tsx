'use client';

import { BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** Pessimistic: never an empty deck while the classroom read is broken. */
export function HqLoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="play-tab-error-card"
      className={cn('rounded-neo border-3 border-neo-red bg-neo-cream px-6 py-8 text-center shadow-hard', className)}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-neo-red bg-neo-red/10 shadow-hard-sm">
        <BarChart3 className="h-8 w-8 text-neo-red" />
      </div>
      <p className="font-neo-body text-lg font-black text-black text-balance">{t('teacher.dashboard.classroomLoadError')}</p>
      <p className="mt-1 text-sm font-bold text-black/60 text-pretty">{t('teacher.dashboard.classroomLoadErrorHint')}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="play-tab-error-retry-button"
        className={cn(
          'mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
          'border-3 border-black bg-neo-cyan font-neo-display font-black text-black shadow-hard',
          'transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
          'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
        )}
      >
        {t('teacher.dashboard.retry')}
      </button>
    </div>
  );
}

export default HqLoadError;
