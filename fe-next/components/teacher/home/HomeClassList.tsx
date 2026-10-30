'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Play, Plus, QrCode, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarLite from '@/components/AvatarLite';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { ClassStreakLine } from '@/components/teacher/hq/ClassStreakLine';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import type { HqClassroom } from '@/components/teacher/hq/GetStudentsInCard';
import { OUTLINE_BUTTON, PANEL, QUIET_LINK, SKELETON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

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

export function HomeNewClass({ href, count, limit, t }: { href: string; count: number; limit: number | null; t: T }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {limit !== null ? (
        <span data-testid="home-class-cap" className="hidden font-neo-body text-xs font-bold text-neo-cream/70 sm:inline">
          {t('eduShell.setup.capMeter', { count, limit })}
        </span>
      ) : null}
      <Link href={href} data-testid="home-new-class" className={cn(QUIET_LINK, 'whitespace-nowrap')}>
        <Plus className="size-4" aria-hidden="true" />
        {t('eduShell.home.newClass')}
      </Link>
    </div>
  );
}

export function HomeClassMeta({
  previewIds,
  memberCount,
  played,
  pending,
  failed,
  language,
  nowMs,
  t,
}: {
  previewIds: readonly string[];
  memberCount: number;
  played: string | undefined;
  pending: boolean;
  failed: boolean;
  language: string;
  nowMs: number;
  t: T;
}) {
  return (
    <div data-testid="home-desk-meta" className="flex flex-wrap items-center gap-x-4 gap-y-2 font-neo-body text-sm font-semibold text-neo-cream/80 sm:text-base">
      {previewIds.length > 0 ? <StudentStack ids={previewIds} total={memberCount} /> : null}
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-4" aria-hidden="true" />
        {t('eduShell.home.students', { count: memberCount })}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-4" aria-hidden="true" />
        <LastPlayed played={played} pending={pending} failed={failed} language={language} nowMs={nowMs} t={t} />
      </span>
    </div>
  );
}

export interface HomeClassListProps {
  classrooms: readonly (Omit<HqClassroom, 'member_count'> & { member_count?: number | null })[];
  /** First few student ids per class; null while loading or failed. */
  studentPreview?: Record<string, string[]> | null;
  /** null while the activity read is in flight or failed. */
  lastPlayedAt: Record<string, string> | null;
  activityFailed: boolean;
  newClassHref?: string;
  /** Free teachers see "2 of 3 classes"; Pro teachers see nothing. */
  classLimit?: number | null;
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
  classLimit = null,
  language,
  nowMs,
  t,
}: HomeClassListProps) {
  const [projectorId, setProjectorId] = useState<string | null>(null);
  const projectorClass = classrooms.find((c) => c.id === projectorId) ?? null;
  return (
    <section aria-labelledby="home-classes-title" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="home-classes-title" className="whitespace-nowrap font-neo-display text-xl font-black text-neo-cream sm:text-2xl">
          {t('eduShell.home.yourClasses')}
        </h2>
        {newClassHref ? <HomeNewClass href={newClassHref} count={classrooms.length} limit={classLimit} t={t} /> : null}
      </div>

      <ul className={cn(PANEL, 'divide-y-[2px] divide-neo-cream/10 overflow-hidden p-0')}>
        {classrooms.map((c) => {
          const played = lastPlayedAt?.[c.id];
          const previewIds = studentPreview?.[c.id] ?? [];
          return (
            <li
              key={c.id}
              data-testid="home-class-row"
              data-tm
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-3 transition-colors duration-150 hover:bg-neo-cream/[0.04] sm:px-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                {previewIds.length > 0 ? (
                  <span className="contents max-sm:hidden"><StudentStack ids={previewIds} total={c.member_count ?? previewIds.length} /></span>
                ) : (
                  <span
                    aria-hidden="true"
                    data-testid="home-class-badge"
                    className="grid size-9 shrink-0 place-items-center rounded-neo border-2 border-neo-cream/35 bg-neo-navy font-neo-display text-xs font-black text-neo-cream"
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
                  <span className="mt-0.5 flex items-center gap-3 font-neo-body text-xs font-semibold text-neo-cream/70 sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 sm:size-4" aria-hidden="true" />
                      <span className="sm:hidden">{c.member_count ?? 0}</span>
                      <span className="hidden sm:inline">{t('eduShell.home.students', { count: c.member_count ?? 0 })}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5 sm:size-4" aria-hidden="true" />
                      <LastPlayed played={played} pending={lastPlayedAt === null && !activityFailed} failed={activityFailed} language={language} nowMs={nowMs} t={t} />
                    </span>
                  </span>
                  {(c.member_count ?? 0) > 0 ? <ClassStreakLine classroomId={c.id} className="mt-1 self-start" /> : null}
                </span>
              </span>
              <span className="flex items-center justify-self-end gap-2">
              <button
                type="button"
                data-testid="home-class-code"
                onClick={() => setProjectorId(c.id)}
                aria-label={t('eduShell.home.showCodeFor', { name: c.name })}
                className={cn(OUTLINE_BUTTON, 'min-w-11 px-2.5')}
              >
                <QrCode className="size-5" aria-hidden="true" />
                <span className="hidden xl:inline">{t('eduShell.home.showCode')}</span>
              </button>
              <Link
                href={teacherHostHref(language, { classroomId: c.id })}
                data-testid="home-class-play"
                data-magnet
                aria-label={t('eduShell.home.playWith', { name: c.name })}
                className={cn(OUTLINE_BUTTON, 'size-11 px-0')}
              >
                <Play className="size-5" aria-hidden="true" />
              </Link>
              </span>
            </li>
          );
        })}
      </ul>
      {projectorClass ? (
        <HqProjectorSheet
          classroom={{ ...projectorClass, member_count: projectorClass.member_count ?? undefined }}
          onClose={() => setProjectorId(null)}
        />
      ) : null}
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
  if (failed) return <span>-</span>;
  if (!played) return <span>{t('eduShell.home.notPlayedRecently')}</span>;
  return <span>{lastPlayedLabel(played, language, nowMs)}</span>;
}

export default HomeClassList;
