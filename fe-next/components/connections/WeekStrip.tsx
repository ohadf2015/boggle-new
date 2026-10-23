'use client';

import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { weekStrip } from '@/lib/connections/progress';

interface WeekStripProps {
  days: readonly string[];
  todayISO: string;
}

/** Seven pips, oldest to today: the days you showed up, lit lime. */
export default function WeekStrip({ days, todayISO }: WeekStripProps) {
  const { t, language } = useLanguage();
  const fmt = new Intl.DateTimeFormat(language, { weekday: 'narrow', timeZone: 'UTC' });
  const pips = weekStrip(days, todayISO);
  return (
    <div data-testid="week-strip" className="flex flex-col gap-1.5">
      <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-widest text-neo-white/70 rtl:tracking-normal">
        {t('connections.week.title')}
      </span>
      <ol className="flex items-center justify-between gap-1.5">
        {pips.map((p) => (
          <li key={p.date} className="flex flex-1 flex-col items-center gap-1" data-played={p.played || undefined}>
            <span
              className={[
                'flex h-8 w-full max-w-[2.5rem] items-center justify-center rounded-neo border-2',
                p.played ? 'border-neo-black bg-neo-lime text-neo-navy shadow-hard-sm' : 'border-neo-cream/40 bg-neo-navy text-transparent',
                p.isToday && !p.played ? 'border-neo-cyan' : '',
              ].join(' ')}
            >
              {p.played && <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden="true" />}
            </span>
            <span className="font-mono text-[0.65rem] uppercase text-neo-white/60">
              {fmt.format(new Date(`${p.date}T00:00:00Z`))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
