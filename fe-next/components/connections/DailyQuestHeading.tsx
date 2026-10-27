'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { DAILY_MODES } from '@/lib/dailyModes';
import { cn } from '@/lib/utils';

/**
 * The in-game title on both Word Bridge daily flavors, in the daily flow's own
 * words: the mode name the hub and results use, plus the quest step.
 */
export default function DailyQuestHeading({ className }: { className?: string }) {
  const { t } = useLanguage();
  const index = DAILY_MODES.findIndex((d) => d.id === 'connections');
  const mode = DAILY_MODES[index];
  if (!mode) return null;
  return (
    <div data-testid="daily-quest-heading" className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy shadow-hard-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- 40px decorative mode art */}
        <img src={mode.art} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span data-testid="daily-quest-step" className="text-[11px] font-black uppercase tracking-[0.18em] text-neo-purple">
          {t('daily.journeyStepOf', { n: index + 1, total: DAILY_MODES.length })}
          {mode.optional ? ` · ${t('daily.journeyOptional')}` : ''}
        </span>
        <h1 className="truncate font-neo-display text-lg font-black leading-tight text-neo-white">{t(mode.titleKey)}</h1>
      </span>
    </div>
  );
}
