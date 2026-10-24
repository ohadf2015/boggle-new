'use client';

import Link from 'next/link';
import { CalendarDays, Play, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarLite from '@/components/AvatarLite';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { ClassStreakLine } from '@/components/teacher/hq/ClassStreakLine';
import { PANEL, QUIET_LINK, SKELETON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const BADGE = ['bg-neo-purple', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-lime'] as const;

function StudentStack({ ids, total }: { ids: readonly string[]; total: number }) {
  const extra = total - ids.length;
  return (
    <span data-testid="home-class-avatars" className="flex shrink-0 items-center ps-1">
      {ids.map((id) => (
        <AvatarLite key={id} userId={id} pixelSize={30} className="-ms-2 ring-2 ring-neo-navy first:ms-0" />
      ))}
      {extra > 0 ? (
        <span
          aria-hidden="true"
          className="-ms-2 grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-neo-black bg-neo-cream px-1 font-neo-display text-[0.7rem] font-black text-neo-black ring-2 ring-neo-navy"
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Short badge text for a class: its first token, capped ("5B - English" → "5B"). */
export function classBadge(name: string): string {
  const first = name.trim().split(/[\s\-–·:]+/)[0] ?? '';
  return (first || name.trim()).slice(0, 3).toUpperCase();
}

const DAY_MS = 86_400_000;

/** "Today" / "Yesterday" / "3 days ago" / a date — in the teacher's locale. */
export function lastPlayedLabel(iso: string, language: string, nowMs: number): string {
  const days = Math.floor((startOfDay(nowMs) - startOfDay(Date.parse(iso))) / DAY_MS);
  if (days < 7) {
    return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(-days, 'day');
  }
  return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface HomeClassListProps {
  classrooms: readonly { id: string; name: string; member_count?: number | null }[];
  /** First few student ids per class; null while loading or failed. */
  studentPreview?: Record<string, string[]> | null;
  /** null while the activity read is in flight or failed. */
  lastPlayedAt: Record<string, string> | null;
  activityFailed: boolean;
  newClassHref: string;
  /** Free teachers see "2 of 3 classes"; Pro teachers see nothing. */
  classLimit: number | null;
  language: string;
  nowMs: number;
  t: T;
}

export function HomeClassList({
  classrooms,
  studentPreview = null,
  lastPlayedAt,
  activityFailed,
  newClassHref,
  classLimit,
  language,
  nowMs,
  t,
}: HomeClassListProps) {
  return (
    <section aria-labelledby="home-classes-title" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="home-classes-title" className="whitespace-nowrap font-neo-display text-xl font-black text-neo-cream sm:text-2xl">
          {t('eduShell.home.yourClasses')}
        </h2>
        <div className="flex items-center gap-3">
          {classLimit !== null ? (
            <span data-testid="home-class-cap" className="hidden font-neo-body text-xs font-bold text-neo-cream/70 sm:inline">
              {t('eduShell.setup.capMeter', { count: classrooms.length, limit: classLimit })}
            </span>
          ) : null}
          <Link href={newClassHref} data-testid="home-new-class" className={cn(QUIET_LINK, 'whitespace-nowrap')}>
            <Plus className="size-4" aria-hidden="true" />
            {t('eduShell.home.newClass')}
          </Link>
        </div>
      </div>

      <ul className={cn(PANEL, 'divide-y-[2px] divide-neo-cream/10 overflow-hidden p-0')}>
        <li aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_7rem_11rem_3rem] gap-3 px-4 py-2 font-neo-body text-[0.7rem] font-bold uppercase tracking-wide text-neo-cream/60 sm:grid">
          <span>{t('eduShell.home.colClass')}</span>
          <span>{t('eduShell.home.colStudents')}</span>
          <span>{t('eduShell.home.colLastPlayed')}</span>
          <span />
        </li>
        {classrooms.map((c, i) => {
          const played = lastPlayedAt?.[c.id];
          const previewIds = studentPreview?.[c.id] ?? [];
          return (
            <li
              key={c.id}
              data-testid="home-class-row"
              data-tm
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_11rem_3rem] sm:px-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                {previewIds.length > 0 ? (
                  <StudentStack ids={previewIds} total={c.member_count ?? previewIds.length} />
                ) : (
                  <span
                    aria-hidden="true"
                    data-testid="home-class-badge"
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-neo border-[2px] border-neo-black font-neo-display text-xs font-black text-neo-black',
                      BADGE[i % BADGE.length],
                    )}
                  >
                    {classBadge(c.name)}
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <Link
                    href={`/${language}/teacher/classroom/${c.id}/analytics`}
                    dir="auto"
                    className="truncate rounded-sm text-start font-neo-body text-base font-bold text-neo-cream hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
                  >
                    {c.name}
                  </Link>
                  <span className="flex items-center gap-3 font-neo-body text-xs font-semibold text-neo-cream/70 sm:hidden">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      {c.member_count ?? 0}
                    </span>
                    <LastPlayed played={played} pending={lastPlayedAt === null && !activityFailed} failed={activityFailed} language={language} nowMs={nowMs} t={t} />
                  </span>
                  {(c.member_count ?? 0) > 0 ? <ClassStreakLine classroomId={c.id} className="mt-1 self-start" /> : null}
                </span>
              </span>
              <span className="hidden items-center gap-1.5 font-neo-body text-sm font-semibold text-neo-cream/85 sm:inline-flex">
                <Users className="size-4" aria-hidden="true" />
                {t('eduShell.home.students', { count: c.member_count ?? 0 })}
              </span>
              <span className="hidden items-center gap-1.5 font-neo-body text-sm font-semibold text-neo-cream/85 sm:inline-flex">
                <CalendarDays className="size-4" aria-hidden="true" />
                <LastPlayed played={played} pending={lastPlayedAt === null && !activityFailed} failed={activityFailed} language={language} nowMs={nowMs} t={t} />
              </span>
              <Link
                href={teacherHostHref(language, { classroomId: c.id })}
                data-testid="home-class-play"
                data-magnet
                aria-label={t('eduShell.home.playWith', { name: c.name })}
                className={cn(
                  'grid size-11 place-items-center justify-self-end rounded-neo border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm',
                  'transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-hard active:scale-[0.97] motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                )}
              >
                <Play className="size-5 fill-current" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LastPlayed({
  played,
  pending,
  failed,
  language,
  nowMs,
  t,
}: {
  played: string | undefined;
  pending: boolean;
  failed: boolean;
  language: string;
  nowMs: number;
  t: T;
}) {
  if (pending) return <span aria-hidden="true" className={cn(SKELETON, 'inline-block h-3 w-16')} />;
  if (failed) return <span>—</span>;
  if (!played) return <span>{t('eduShell.home.notPlayedRecently')}</span>;
  return <span>{lastPlayedLabel(played, language, nowMs)}</span>;
}

export default HomeClassList;
