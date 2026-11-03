'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { DAILY_MODES, type DailyModeId } from '@/lib/dailyModes';
import { cn } from '@/lib/utils';
import { chainPips } from './dailyHandoff';

const PIP_CLASS = {
  done: 'w-2 bg-neo-lime',
  active: 'w-5 bg-neo-yellow',
  next: 'w-2 bg-neo-white/25',
} as const;

/**
 * First frame of a daily game: shown by the route's loading boundary so the
 * results → game handoff lands on the step card instead of a spinner.
 * Static surface; only the small art pops (full-width opacity tweens flash on mobile).
 */
export function DailyArrivalCard({ modeId }: { modeId: DailyModeId }) {
  const { t } = useLanguage();
  const index = DAILY_MODES.findIndex((md) => md.id === modeId);
  const mode = DAILY_MODES[index];
  if (!mode) return null;
  const pips = chainPips(modeId);

  return (
    <div
      role="status"
      data-testid="daily-arrival"
      className="flex-1 min-h-[100svh] flex flex-col items-center justify-center gap-4 bg-neo-navy page-content-safe"
    >
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-lime/80">
        {t('daily.journeyStepOf', { n: index + 1, total: DAILY_MODES.length })}
      </span>
      <div className="w-28 h-28 rounded-full border-3 border-neo-black overflow-hidden shadow-[4px_4px_0_black,0_0_24px_rgba(191,255,0,0.45)] motion-safe:animate-neo-pop">
        {/* eslint-disable-next-line @next/next/no-img-element -- loading-boundary art */}
        <img src={mode.art} alt="" className="w-full h-full object-cover" draggable={false} />
      </div>
      <h1 className="font-neo-display font-black text-4xl text-neo-white text-center px-6">{t(mode.titleKey)}</h1>
      <span aria-hidden data-testid="daily-arrival-pips" className="flex items-center gap-1">
        {pips.map((pip, i) => (
          <span
            key={DAILY_MODES[i].id}
            data-pip={pip}
            className={cn('block h-2 rounded-full border border-neo-black', PIP_CLASS[pip])}
          />
        ))}
      </span>
    </div>
  );
}

export default DailyArrivalCard;
