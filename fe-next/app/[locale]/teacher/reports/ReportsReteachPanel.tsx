'use client';

import Link from 'next/link';
import { Play, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { MissedPracticeAction } from '@/components/teacher/reports/MissedPracticeAction';
import { useRosterNames } from '@/components/teacher/reports/useWordMasteryReport';
import { ProPill } from '@/components/education/results/ProPill';
import { trackReteachStarted } from '@/components/education/results/trackResultsAction';
import { cn } from '@/lib/utils';
import { exampleSnapshot, snapshotWords, type ClassEvidence } from './reteachSnapshotModel';
import { useReteachSnapshot } from './useReteachSnapshot';

interface PickerClass {
  id: string;
  name: string;
  member_count?: number;
}

const NAMES_SHOWN = 3;
const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy-light';
const PRESS = 'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none';
const SHELL = 'rounded-neo border-[3px] border-neo-black bg-neo-navy-light p-4 shadow-hard sm:p-5';

const splitList = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);

export function ReportsReteachPanel({
  classrooms,
  onOpenClass,
  focusClassroomId,
}: {
  classrooms: readonly PickerClass[];
  onOpenClass: (classroomId: string) => void;
  /** Inside one class's report: read only that class and drop the way into it. */
  focusClassroomId?: string;
}) {
  const { t } = useLanguage();
  const scoped = useMemo(
    () => (focusClassroomId ? classrooms.filter((c) => c.id === focusClassroomId) : classrooms),
    [classrooms, focusClassroomId]
  );
  const state = useReteachSnapshot(scoped);

  if (state.status === 'loading') {
    return (
      <section data-testid="reports-reteach-panel" aria-busy="true" className={cn(SHELL, 'mb-6 min-h-64')}>
        <span className="sr-only" role="status">{t('teacher.reports.loadingClassrooms')}</span>
        <div aria-hidden="true" className="h-7 w-48 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
        <div aria-hidden="true" className="mt-4 grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (state.status === 'error') return null;

  const example = state.snapshot === null;
  const snapshot =
    state.snapshot ??
    exampleSnapshot(
      splitList(t('teacher.reports.reteach.exampleWords', 'thunder,breeze,frost,cloud')),
      splitList(t('teacher.reports.reteach.exampleNames', 'Maya,Leo'))
    );
  const startClassId = example ? scoped[0]?.id : snapshot.classroomId;
  const focused = !!focusClassroomId;

  return (
    <section data-testid="reports-reteach-panel" aria-labelledby="reports-reteach-title" className={cn(SHELL, 'mb-6')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center max-sm:hidden rounded-neo border-2 border-neo-black bg-neo-pink text-neo-black">
          <Target className="size-5" strokeWidth={2.5} />
        </span>
        <h2 id="reports-reteach-title" dir="auto" className="font-neo-display text-xl font-black leading-tight text-neo-white sm:text-2xl">
          {t('teacher.reports.reteach.title', 'What to reteach')}
        </h2>
        {example ? (
          <span
            data-testid="reteach-example-pill"
            className="rounded-full border-2 border-neo-black bg-neo-cyan px-2.5 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black"
          >
            {t('teacher.reports.reteach.exampleBadge', 'Example')}
          </span>
        ) : (
          <span dir="auto" className="ms-auto rounded-full border-2 border-neo-cream/40 px-2 py-0.5 text-xs font-bold tabular-nums text-neo-cream sm:px-2.5 sm:text-sm">
            {t('teacher.reports.reteach.accuracy', 'Class accuracy {pct}%', { pct: snapshot.classAccuracy })}
          </span>
        )}
      </div>
      <p dir="auto" className={cn('mt-2 max-w-prose text-sm leading-snug text-neo-cream sm:text-base', focused && !example && 'max-sm:hidden')}>
        {example
          ? t(
              'teacher.reports.reteach.exampleBody',
              'After your first game, this shows the words your class missed and who needs help. Sample data below.'
            )
          : t('teacher.reports.reteach.fromClass', 'Words {name} missed most in its games so far.', { name: `⁨${snapshot.classroomName}⁩` })}
      </p>

      <WordRows words={snapshotWords(snapshot.words)} />
      <NeedsHelp snapshot={snapshot} example={example} />

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-neo-cream/20 pt-4">
        <PrimaryAction snapshot={snapshot} example={example} focused={focused} startClassId={startClassId} />
        {!example && !focused && !snapshot.locked ? (
          <button
            type="button"
            data-testid="reteach-open-class"
            onClick={() => onOpenClass(snapshot.classroomId)}
            className={cn(
              'inline-flex min-h-11 items-center rounded-neo border-2 border-neo-cream/60 px-4 sm:ms-auto font-neo-display text-sm font-black text-neo-cream hover:border-neo-cream',
              FOCUS
            )}
          >
            {t('teacher.reports.reteach.openClass', 'Open class report')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WordRows({ words }: { words: ClassEvidence['words'] }) {
  const { t } = useLanguage();
  return (
    <ul className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
      {words.map((w) => (
        <li
          key={w.word}
          data-testid="reteach-word"
          data-word={w.word}
          className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-1.5 max-sm:[&:nth-child(n+4)]:hidden sm:py-2 sm:[&:last-child:nth-child(odd)]:col-span-2"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span dir="auto" className="min-w-0 truncate font-neo-display text-lg font-black text-neo-white">{w.display}</span>
            <span dir="auto" className="shrink-0 text-sm font-black tabular-nums text-neo-pink">
              {t('teacher.reports.reteach.missRate', '{pct}% missed', { pct: w.missRate })}
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-neo-black/50">
            <div className="h-full rounded-full bg-neo-pink" style={{ inlineSize: `${w.missRate}%` }} />
          </div>
          <p dir="auto" className="mt-1 text-xs font-bold text-neo-cream/80">
            {t('teacher.reports.reteach.studentsMissed', '{missing} of {asked} students missed it', {
              missing: w.studentsMissing,
              asked: w.studentsAsked,
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

function NeedsHelp({ snapshot, example }: { snapshot: ClassEvidence; example: boolean }) {
  const { t } = useLanguage();
  const fallbackName = t('teacher.reports.arc.unknownStudent');
  const roster = useRosterNames(snapshot.classroomId, !example && !snapshot.locked && snapshot.needsHelp.length > 0, fallbackName);
  const names = example ? snapshot.needsHelp : snapshot.needsHelp.map((id) => roster[id]).filter(Boolean);
  const extra = names.length - NAMES_SHOWN;

  return (
    <div data-testid="reteach-needs-help" className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span dir="auto" className="text-sm font-black text-neo-cream">{t('teacher.reports.reteach.needsHelp', 'Needs help:')}</span>
      {snapshot.locked ? (
        <>
          <ProPill label={t('eduLiveRoom.hostResults.proPill', 'Pro')} />
          <span dir="auto" className="text-sm font-bold text-neo-cream/80">
            {t('teacher.reports.reteach.needsHelpPro', 'Student-by-student detail comes with Teacher Pro.')}
          </span>
        </>
      ) : snapshot.needsHelp.length === 0 ? (
        <span dir="auto" className="text-sm font-bold text-neo-cream/80">
          {t('teacher.reports.reteach.needsHelpNone', 'Everyone is at the class goal.')}
        </span>
      ) : names.length === 0 ? (
        <span aria-hidden="true" className="h-7 w-32 rounded-full bg-neo-cream/10 motion-safe:animate-pulse" />
      ) : (
        <>
          {names.slice(0, NAMES_SHOWN).map((name) => (
            <span key={name} dir="auto" className="rounded-full border-2 border-neo-yellow bg-neo-navy px-2 py-0.5 text-sm font-bold text-neo-yellow sm:px-2.5">
              {name}
            </span>
          ))}
          {extra > 0 ? (
            <span dir="auto" className="text-sm font-bold text-neo-cream/80">
              {t('teacher.reports.reteach.moreStudents', '+{count} more', { count: extra })}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

function PrimaryAction({
  snapshot,
  example,
  focused,
  startClassId,
}: {
  snapshot: ClassEvidence;
  example: boolean;
  focused: boolean;
  startClassId?: string;
}) {
  const { t, language } = useLanguage();
  const { hasPro } = useTeacherPro();
  const words = snapshotWords(snapshot.words).map((w) => w.word);

  if (!example && !snapshot.locked) {
    return (
      <div
        className="min-w-0"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest('button:not([disabled])')) {
            trackReteachStarted({ surface: 'reports', words: words.length, plan: hasPro ? 'pro' : 'free' });
          }
        }}
      >
        <MissedPracticeAction classroomId={snapshot.classroomId} classroomName={snapshot.classroomName} locked={false} words={words} />
      </div>
    );
  }
  if (!startClassId) return null;
  return (
    <Link
      data-testid="reteach-start-game"
      href={`/${language}/education/classroom-game?classroomId=${encodeURIComponent(startClassId)}`}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-neo px-5 font-neo-display text-base font-black',
        !snapshot.locked
          ? cn('border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard', PRESS)
          : 'border-2 border-neo-cream/60 text-neo-cream hover:border-neo-cream',
        FOCUS
      )}
    >
      <Play className="size-4 shrink-0" aria-hidden="true" />
      {example && !focused
        ? t('teacher.reports.reteach.startFirstGame', 'Start your first game')
        : t('teacher.reports.emptyClass.cta', 'Start a game with this class')}
    </Link>
  );
}
