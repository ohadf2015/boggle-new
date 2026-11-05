'use client';

import { useId, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { Gamepad2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { AnimatedNumber, EDU_MOTION, useReducedMotionSafe } from '@/components/education/motion';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import type { TeacherWeekStatus } from '@/hooks/useTeacherWeekStats';
import { weekMascotPose } from '@/lib/education/homeSessionRail';
import { PANEL, SKELETON } from './homeStyles';
import { classesPlayedShare } from './weekPulse';

type T = (key: string, params?: Record<string, string | number>) => string;

const TILES = [
  { id: 'games', key: 'gamesPlayed', label: 'eduShell.week.games', tone: 'text-neo-cyan', Icon: Gamepad2 },
  { id: 'students', key: 'totalStudents', label: 'eduShell.week.students', tone: 'text-neo-pink', Icon: Users },
] as const;

const TILE = 'flex min-w-0 flex-col gap-1 rounded-neo border-2 border-neo-cream/20 bg-neo-navy px-2.5 py-2 [@media(max-height:820px)]:py-1.5';
const NUMBER = 'font-neo-display text-2xl font-black tabular-nums leading-none';

function StatValue({ status, value }: { status: TeacherWeekStatus; value: number | null }) {
  if (status === 'loading') return <span aria-hidden="true" className={cn(SKELETON, 'inline-block h-6 w-7')} />;
  return value === null ? <>—</> : <AnimatedNumber to={value} />;
}

/** Last 7 days at a glance: two count tiles and a "classes that played" meter, with the mascot reacting. */
export function HomeWeekCard({
  summary,
  status,
  classCount,
  t,
  children,
  childrenClassName,
}: {
  summary: TeacherWeekSummary | null;
  status: TeacherWeekStatus;
  /** Every class the teacher has: the meter's denominator. */
  classCount?: number;
  t: T;
  children?: ReactNode;
  childrenClassName?: string;
}) {
  const reduced = useReducedMotionSafe();
  const activeLabelId = useId();
  const pose = status === 'ready' ? weekMascotPose(summary) : null;
  const share = summary && classCount ? classesPlayedShare(summary.activeClasses, classCount) : null;
  return (
    <section data-testid="home-week" aria-labelledby="home-week-title" className={cn(PANEL, 'flex flex-col gap-2.5 p-3')}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center [@media(min-height:821px)]:size-14">
          {pose ? <EduMascot moment={pose} size={56} className="size-10 [@media(min-height:821px)]:size-14" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="home-week-title" className="font-neo-display text-base font-black text-neo-cream">
            {t('eduShell.week.title')}
          </h2>
          {pose === 'tip' ? <p className="font-neo-body text-xs font-semibold leading-snug text-neo-cream/75 [@media(max-height:820px)]:sr-only">{t('eduShell.week.quiet')}</p> : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {TILES.map(({ id, key, label, tone, Icon }) => (
          <div key={id} data-testid="home-week-tile" className={TILE}>
            <dt className="order-2 font-neo-body text-xs font-semibold leading-tight text-neo-cream/70">{t(label)}</dt>
            <dd data-testid={`home-week-${id}`} className={cn('order-1 flex items-center gap-1.5', NUMBER, tone)}>
              <Icon className="size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              <StatValue status={status} value={summary ? summary[key] : null} />
            </dd>
          </div>
        ))}

        <div className={cn(TILE, 'col-span-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5')}>
          <dt id={activeLabelId} className="min-w-0 font-neo-body text-xs font-semibold leading-tight text-neo-cream/70">
            {t('eduShell.week.active')}
          </dt>
          <dd data-testid="home-week-active" dir="ltr" className={cn('text-xl', NUMBER, 'text-neo-yellow')}>
            <StatValue status={status} value={share ? share.played : summary ? summary.activeClasses : null} />
            {share ? (
              <span data-testid="home-week-active-total" className="ms-1 text-base text-neo-cream/60">/ {share.total}</span>
            ) : null}
          </dd>
          {share && status === 'ready' ? (
            <dd
              role="progressbar"
              aria-labelledby={activeLabelId}
              aria-valuemin={0}
              aria-valuemax={share.total}
              aria-valuenow={share.played}
              className="col-span-2"
            >
              <div data-accent-decor className="h-3 overflow-hidden rounded-full border-2 border-neo-cream/50 bg-neo-navy-light [@media(max-height:820px)]:h-2.5">
                <m.div
                  data-testid="home-week-active-fill"
                  className="h-full origin-left rounded-full bg-neo-yellow rtl:origin-right"
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: share.fraction }}
                  transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay: 0.25 }}
                />
              </div>
            </dd>
          ) : null}
        </div>
      </dl>

      {children ? <div className={cn('border-t-[2px] border-neo-cream/15 pt-3', childrenClassName)}>{children}</div> : null}
      {status === 'error' ? (
        <p role="status" className="font-neo-body text-xs font-semibold text-neo-cream/70">
          {t('eduShell.week.unavailable')}
        </p>
      ) : null}
    </section>
  );
}

export default HomeWeekCard;
