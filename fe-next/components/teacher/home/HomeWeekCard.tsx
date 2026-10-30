'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import type { TeacherWeekStatus } from '@/hooks/useTeacherWeekStats';
import { weekMascotPose } from '@/lib/education/homeSessionRail';
import { PANEL, SKELETON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const STATS = [
  { id: 'games', key: 'gamesPlayed', label: 'eduShell.week.games', tone: 'text-neo-cyan' },
  { id: 'students', key: 'totalStudents', label: 'eduShell.week.students', tone: 'text-neo-pink' },
  { id: 'active', key: 'activeClasses', label: 'eduShell.week.active', tone: 'text-neo-yellow' },
] as const;

/** Three real numbers for the last 7 days, with the mascot reacting; "—" when the read failed. */
export function HomeWeekCard({ summary, status, t, children }: { summary: TeacherWeekSummary | null; status: TeacherWeekStatus; t: T; children?: ReactNode }) {
  const pose = status === 'ready' ? weekMascotPose(summary) : null;
  return (
    <section data-testid="home-week" aria-labelledby="home-week-title" className={cn(PANEL, 'flex flex-col gap-2 p-3')}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center [@media(min-height:821px)]:size-16">
          {pose ? <EduMascot moment={pose} size={64} className="size-10 [@media(min-height:821px)]:size-16" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="home-week-title" className="font-neo-display text-base font-black text-neo-cream">
            {t('eduShell.week.title')}
          </h2>
          <dl className="mt-1 grid grid-cols-3 gap-2">
            {STATS.map((s) => (
              <div key={s.id} className="flex min-w-0 flex-col">
                <dd data-testid={`home-week-${s.id}`} className={cn('font-neo-display text-2xl font-black tabular-nums leading-none', s.tone)}>
                  {status === 'loading' ? (
                    <span aria-hidden="true" className={cn(SKELETON, 'inline-block h-6 w-7')} />
                  ) : summary ? (
                    summary[s.key]
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="mt-0.5 font-neo-body text-xs font-semibold leading-tight text-neo-cream/70">{t(s.label)}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {pose === 'tip' ? <p className="font-neo-body text-xs font-semibold text-neo-cream/85">{t('eduShell.week.quiet')}</p> : null}
      {children ? <div className="border-t-[2px] border-neo-cream/15 pt-3">{children}</div> : null}
      {status === 'error' ? (
        <p role="status" className="font-neo-body text-xs font-semibold text-neo-cream/70">
          {t('eduShell.week.unavailable')}
        </p>
      ) : null}
    </section>
  );
}

export default HomeWeekCard;
