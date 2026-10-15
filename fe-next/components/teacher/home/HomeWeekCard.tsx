'use client';

import { cn } from '@/lib/utils';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import type { TeacherWeekStatus } from '@/hooks/useTeacherWeekStats';
import { PANEL, SKELETON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const STATS = [
  { id: 'games', key: 'gamesPlayed', label: 'eduShell.week.games', ink: 'text-neo-lime' },
  { id: 'students', key: 'totalStudents', label: 'eduShell.week.students', ink: 'text-neo-cyan' },
  { id: 'active', key: 'activeClasses', label: 'eduShell.week.active', ink: 'text-neo-pink' },
] as const;

/** Three real numbers for the last 7 days; one friendly line before the first game; "—" when the read failed. */
export function HomeWeekCard({ summary, status, t }: { summary: TeacherWeekSummary | null; status: TeacherWeekStatus; t: T }) {
  return (
    <section data-testid="home-week" aria-labelledby="home-week-title" className={cn(PANEL, 'p-4')}>
      <h2 id="home-week-title" className="font-neo-display text-lg font-black text-neo-cream">
        {t('eduShell.week.title')}
      </h2>
      {summary && Object.keys(summary.lastPlayedAt).length === 0 ? (
        <p data-testid="home-week-empty" className="mt-2 font-neo-body text-sm text-neo-cream/80">
          {t('eduShell.week.empty')}
        </p>
      ) : (
      <dl className="mt-3 grid grid-cols-3 divide-x-[2px] divide-neo-cream/15 rtl:divide-x-reverse">
        {STATS.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-1 px-1 text-center">
            <dd data-testid={`home-week-${s.id}`} className={cn('font-neo-display text-3xl font-black tabular-nums leading-none', s.ink)}>
              {status === 'loading' ? (
                <span aria-hidden="true" className={cn(SKELETON, 'inline-block h-7 w-8')} />
              ) : summary ? (
                summary[s.key]
              ) : (
                '—'
              )}
            </dd>
            <dt className="font-neo-body text-xs font-semibold leading-tight text-neo-cream/80">{t(s.label)}</dt>
          </div>
        ))}
      </dl>
      )}
      {status === 'error' ? (
        <p role="status" className="mt-3 font-neo-body text-xs font-semibold text-neo-cream/70">
          {t('eduShell.week.unavailable')}
        </p>
      ) : null}
    </section>
  );
}

export default HomeWeekCard;
