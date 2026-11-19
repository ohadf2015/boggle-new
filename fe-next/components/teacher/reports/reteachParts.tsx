'use client';

import Link from 'next/link';
import { Play, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { MissedPracticeAction } from '@/components/teacher/reports/MissedPracticeAction';
import { trackReteachStarted, type ResultsSurface } from '@/components/education/results/trackResultsAction';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import type { HardWord } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';

export const SNAPSHOT_WORDS = 4;

export function snapshotWords(words: readonly HardWord[], limit = SNAPSHOT_WORDS): HardWord[] {
  return words
    .filter((w) => w.missRate > 0)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, limit);
}

export const REPORT_HERO_PANEL = 'rounded-neo-xl border-[3px] border-neo-black bg-neo-navy-light p-5 shadow-hard-lg sm:p-7';

const HERO_ACTION =
  'flex min-h-16 w-full items-center justify-center gap-3 rounded-neo-lg border-[3px] border-neo-black bg-neo-lime px-5 py-3 font-neo-display text-xl font-black text-neo-black shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy-light';

const BADGE_TONE = {
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  yellow: 'bg-neo-yellow',
  purple: 'bg-neo-purple',
  red: 'bg-neo-red',
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export function IconBadge({ icon: Icon, tone, className }: { icon: LucideIcon; tone: BadgeTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-9 shrink-0 place-items-center rounded-neo border-2 border-neo-black text-neo-black shadow-hard-sm sm:size-10', BADGE_TONE[tone], className)}
    >
      <Icon className="size-5" strokeWidth={2.5} />
    </span>
  );
}

export function ReteachWordRows({ words, columns = false }: { words: readonly HardWord[]; columns?: boolean }) {
  const { t } = useLanguage();
  return (
    <ul className={cn('mt-2', columns && 'sm:grid sm:grid-cols-2 sm:gap-x-8')}>
      {words.map((w) => (
        <li
          key={w.word}
          data-testid="reteach-word"
          data-word={w.word}
          className="border-b-2 border-neo-cream/15 py-2 max-sm:[&:nth-child(n+4)]:hidden"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span dir="auto" className="min-w-0 truncate font-neo-display text-xl font-black text-neo-white">{w.display}</span>
            <span className="shrink-0 text-end">
              <span dir="auto" className="block text-sm font-black tabular-nums text-neo-pink">
                {t('teacher.reports.reteach.missRate', '{pct}% missed', { pct: w.missRate })}
              </span>
              <span dir="auto" className="block text-xs font-bold text-neo-cream/70">
                {t('teacher.reports.reteach.studentsMissed', '{missing} of {asked} students missed it', {
                  missing: w.studentsMissing,
                  asked: w.studentsAsked,
                })}
              </span>
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-neo-black/50">
            <div className="h-full rounded-full bg-neo-pink" style={{ inlineSize: `${w.missRate}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReteachPracticeAction({
  classroomId,
  classroomName,
  words,
  surface,
}: {
  classroomId: string;
  classroomName: string;
  words: string[];
  surface: ResultsSurface;
}) {
  const { hasPro } = useTeacherPro();
  return (
    <div
      className="min-w-0"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest('button:not([disabled])')) {
          trackReteachStarted({ surface, words: words.length, plan: hasPro ? 'pro' : 'free' });
        }
      }}
    >
      <MissedPracticeAction classroomId={classroomId} classroomName={classroomName} locked={false} words={words} hero />
    </div>
  );
}

export function ReteachStartGame({ classroomId, label, testId }: { classroomId: string; label: string; testId: string }) {
  const { language } = useLanguage();
  return (
    <Link data-testid={testId} href={teacherHostHref(language, { classroomId })} className={HERO_ACTION}>
      <Play className="size-6 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}
