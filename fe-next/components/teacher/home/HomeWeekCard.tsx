'use client';

import type { ReactNode } from 'react';
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

/** Three real numbers for the last 7 days; "—" when the read failed. Home hides it until a first game. */
export function HomeWeekCard({ summary, status, t, children }: { summary: TeacherWeekSummary | null; status: TeacherWeekStatus; t: T; children?: ReactNode }) {
  return (
    <section data-testid="home-week" aria-labelledby="home-week-title" className={cn(PANEL, 'p-4')}>
      <h2 id="home-week-title" className="font-neo-display text-lg font-black text-neo-cream">
        {t('eduShell.week.title')}
      </h2>
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
      {children ? <div className="mt-4 border-t-[2px] border-neo-cream/15 pt-3">{children}</div> : null}
      {status === 'error' ? (
        <p role="status" className="mt-3 font-neo-body text-xs font-semibold text-neo-cream/70">
          {t('eduShell.week.unavailable')}
        </p>
      ) : null}
    </section>
  );
}

export default HomeWeekCard;
