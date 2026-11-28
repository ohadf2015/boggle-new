'use client';

/**
 * "This week in your classroom" — practice totals and awards from
 * student_lesson_progress, plus the 7-day host nudge.
 */
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { GAME_CARD } from '@/components/teacher/home/homeStyles';
import { cn } from '@/lib/utils';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { ClassroomWeekDigest } from './classroomWeekActivity';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomWeekSectionProps {
  classroomName: string;
  digest: ClassroomWeekDigest | null;
  status: 'loading' | 'ready' | 'error';
  showNudge: boolean;
  hostHref: string;
  onRetry: () => void;
  t: T;
}

export function ClassroomWeekSection({
  classroomName,
  digest,
  status,
  showNudge,
  hostHref,
  onRetry,
  t,
}: ClassroomWeekSectionProps) {
  const ready = status === 'ready' && digest != null;
  const nudge = ready && showNudge;

  return (
    <section
      data-testid="classroom-week-section"
      aria-label={t('teacher.digest.classroomWeekRegion', { classroom: classroomName })}
      className={cn(GAME_CARD, 'space-y-3 p-4')}
    >
      <header>
        <h2 className="font-neo-display text-xl font-black text-edu-ink">{t('teacher.digest.classroomWeekTitle')}</h2>
      </header>

      {status === 'loading' ? (
        <div
          data-testid="classroom-week-loading"
          aria-busy="true"
          className="flex min-h-20 items-center justify-center gap-2 text-edu-ink/80"
        >
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{t('teacher.digest.classroomWeekLoading')}</span>
        </div>
      ) : status === 'error' || !digest ? (
        <div className="p-2 text-center" data-testid="classroom-week-error">
          <p className="font-bold text-edu-ink">{t('teacher.digest.classroomWeekError')}</p>
          <button
            type="button"
            data-testid="classroom-week-retry"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-11 items-center rounded-neo border-[3px] border-neo-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-neo-black shadow-hard"
          >
            {t('teacher.digest.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div data-testid="classroom-week-students">
              <WeekTile value={digest.studentsPracticed} label={t('teacher.digest.classroomWeekStudents')} />
            </div>
            <div data-testid="classroom-week-sessions">
              <WeekTile value={digest.practiceSessions} label={t('teacher.digest.classroomWeekSessions')} />
            </div>
            <div data-testid="classroom-week-awards">
              <WeekTile value={digest.awardsEarned} label={t('teacher.digest.classroomWeekAwards')} />
            </div>
          </div>
          {!digest.practicedThisWeek ? (
            <p data-testid="classroom-week-empty" className="text-sm font-bold text-edu-ink/80">
              {t('teacher.digest.classroomWeekEmpty')}
            </p>
          ) : null}
        </>
      )}

      {nudge ? (
        <Link
          href={hostHref}
          data-testid="classroom-week-nudge"
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'classroom_week_host_round' })}
          className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 py-3 text-center text-neo-navy shadow-hard focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan"
        >
          <span className="font-neo-body text-sm font-bold">{t('teacher.digest.classroomWeekNudge')}</span>
          <span className="font-neo-display text-base font-black">{t('teacher.digest.classroomWeekNudgeCta')}</span>
        </Link>
      ) : null}
    </section>
  );
}

function WeekTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-neo border-2 border-edu-line bg-edu-page px-2 py-3 text-center text-edu-ink">
      <span className="font-neo-display text-3xl font-black tabular-nums leading-none">{value}</span>
      <span dir="auto" className="text-xs font-bold uppercase leading-tight tracking-wide text-edu-ink/70">{label}</span>
    </div>
  );
}
