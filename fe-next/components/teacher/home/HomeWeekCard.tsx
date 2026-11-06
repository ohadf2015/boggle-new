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
import { GAME_CARD, SKELETON, STICKER } from './homeStyles';
import { classesPlayedShare } from './weekPulse';

type T = (key: string, params?: Record<string, string | number>) => string;

const TILE = 'flex min-w-0 flex-col gap-1 rounded-neo border-2 border-neo-cream/20 bg-neo-navy px-2.5 py-2 [@media(max-height:820px)]:py-1.5';
// The reward tile: one filled accent block that leads the panel; black text keeps it above 4.5:1 on cyan.
const BIG_TILE = 'flex min-w-0 flex-col gap-1 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 py-2 text-neo-black shadow-hard [@media(max-height:820px)]:py-1.5';
const NUMBER = 'font-neo-display text-2xl font-black tabular-nums leading-none';
const MAX_SEGMENTS = 12;

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
    <section data-testid="home-week" aria-labelledby="home-week-title" className={cn(GAME_CARD, 'flex flex-col gap-2.5 p-3')}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 animate-edu-bob place-items-center [@media(min-height:821px)]:size-14">
          {pose ? <EduMascot moment={pose} size={56} className="size-10 [@media(min-height:821px)]:size-14" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="home-week-title" data-accent-decor className={cn(STICKER, 'bg-neo-pink text-base')}>
            {t('eduShell.week.title')}
          </h2>
          {pose === 'tip' ? <p className="mt-1.5 font-neo-body text-xs font-semibold leading-snug text-neo-cream/75 [@media(max-height:820px)]:sr-only">{t('eduShell.week.quiet')}</p> : null}
        </div>
      </div>

      <dl className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2">
        <div data-testid="home-week-tile" data-accent-decor className={BIG_TILE}>
          <dt className="order-2 font-neo-body text-xs font-bold leading-tight text-neo-black/80">{t('eduShell.week.games')}</dt>
          <dd data-testid="home-week-games" className={cn('order-1 flex items-center gap-2', NUMBER, 'text-4xl [@media(max-height:820px)]:text-3xl')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-neo-black bg-neo-cream">
              <Gamepad2 className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <StatValue status={status} value={summary ? summary.gamesPlayed : null} />
          </dd>
        </div>
        <div data-testid="home-week-tile" className={cn(TILE, 'justify-center')}>
          <dt className="order-2 font-neo-body text-xs font-semibold leading-tight text-neo-cream/70">{t('eduShell.week.students')}</dt>
          <dd data-testid="home-week-students" className={cn('order-1 flex items-center gap-1.5', NUMBER, 'text-neo-pink')}>
            <Users className="size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <StatValue status={status} value={summary ? summary.totalStudents : null} />
          </dd>
        </div>

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
              <div data-accent-decor className="relative h-4 overflow-hidden rounded-neo border-2 border-neo-black bg-neo-navy-light [@media(max-height:820px)]:h-3.5">
                <m.div
                  data-testid="home-week-active-fill"
                  className="edu-stripes h-full origin-left bg-neo-yellow rtl:origin-right"
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: share.fraction }}
                  transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay: 0.25 }}
                />
                {share.total > 1 && share.total <= MAX_SEGMENTS ? (
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: share.total }, (_, i) => (
                      <span
                        key={i}
                        data-testid="home-week-active-segment"
                        data-filled={i < share.played}
                        className="flex-1 border-e-2 border-neo-black last:border-e-0"
                      />
                    ))}
                  </div>
                ) : null}
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
