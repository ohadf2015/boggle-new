'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyActive, StudentPulse, StudentStatus } from '@/lib/education/pro/classInsights';
import { STATUSES, STATUS_VIEW, daysSince, pct } from './overviewModel';

export const PANEL = 'rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light p-3 shadow-hard-lg sm:p-4';
export const PANEL_TITLE = 'font-neo-display text-lg font-black text-neo-cream';

export function StatusStrip({
  counts, active, onToggle,
}: { counts: Record<StudentStatus, number>; active: StudentStatus | null; onToggle: (s: StudentStatus) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label={t('education.analytics.overview.statusTitle')}>
      {STATUSES.map((s) => {
        const { icon: Icon, chip, text } = STATUS_VIEW[s];
        const label = t(`education.analytics.overview.status.${s}`);
        return (
          <button
            key={s}
            type="button"
            data-testid={`status-${s}`}
            aria-pressed={active === s}
            title={label}
            onClick={() => onToggle(s)}
            className={cn(
              'flex min-h-14 items-center gap-2 rounded-neo-lg border-[3px] px-3 py-2 text-start shadow-hard transition-transform active:translate-y-px motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
              chip, active === s && 'ring-4 ring-neo-cream',
            )}
          >
            <Icon aria-hidden className={cn('size-5 shrink-0', text)} />
            <span className="font-neo-display text-2xl font-bold leading-none text-neo-cream">{counts[s]}</span>
            <span className="min-w-0 font-neo-body text-xs font-bold leading-tight text-neo-cream/90">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ActivityBars({ days, locale }: { days: DailyActive[]; locale: string }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex h-24 items-end gap-1.5" role="img" aria-label={days.map((d) => `${d.day}: ${d.count}`).join(', ')}>
      {days.map((d) => (
        <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="font-neo-body text-[11px] font-bold text-neo-cream">{d.count}</span>
          <div
            className="w-full rounded-t-neo bg-neo-cyan"
            style={{ height: `${Math.max(d.count > 0 ? 8 : 2, (d.count / max) * 64)}px` }}
          />
          <span className="font-neo-body text-[11px] text-neo-cream/80">
            {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StudentRow({
  pulse, name, today, onOpen,
}: { pulse: StudentPulse; name: string; today: string; onOpen: (id: string) => void }) {
  const { t } = useLanguage();
  const { icon: Icon, text } = STATUS_VIEW[pulse.status];
  const statusLabel = t(`education.analytics.overview.status.${pulse.status}`);
  const detail =
    pulse.status === 'needsHelp'
      ? t('education.analytics.overview.reason.needsHelp', { pct: pct(pulse.accuracy) })
      : pulse.lastPractice === null
        ? t('education.analytics.overview.reason.notStarted')
        : pulse.lastPractice === today
          ? t('education.analytics.overview.today')
          : t('education.analytics.daysAgo', { count: daysSince(pulse.lastPractice, today) });
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(pulse.id)}
        title={t('education.analytics.overview.openReport', { name })}
        className="flex min-h-11 w-full items-center gap-2 rounded-neo border-2 border-neo-cream/40 px-2.5 py-1.5 text-start hover:bg-neo-cream/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <Icon aria-label={statusLabel} role="img" className={cn('size-4 shrink-0', text)} />
        <span className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-cream" title={name}><bdi>{name}</bdi></span>
        <span className="shrink-0 font-neo-body text-xs text-neo-cream/80">{detail}</span>
        {pulse.accuracy !== null && (
          <span aria-hidden className="hidden h-2 w-14 shrink-0 overflow-hidden rounded-full bg-neo-cream/15 sm:block">
            <span className={cn('block h-full', pulse.accuracy >= 0.8 ? 'bg-neo-lime' : pulse.accuracy >= 0.6 ? 'bg-neo-cyan' : 'bg-neo-red')} style={{ width: `${pct(pulse.accuracy)}%` }} />
          </span>
        )}
      </button>
    </li>
  );
}
