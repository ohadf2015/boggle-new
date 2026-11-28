'use client';

import { useEffect } from 'react';
import { Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRosterNames } from '@/components/teacher/reports/useWordMasteryReport';
import { ProPill } from '@/components/education/results/ProPill';
import {
  IconBadge,
  REPORT_HERO_PANEL,
  ReteachPracticeAction,
  ReteachStartGame,
  ReteachWordRows,
  snapshotWords,
} from '@/components/teacher/reports/reteachParts';
import { cn } from '@/lib/utils';
import { exampleSnapshot, type ClassEvidence } from './reteachSnapshotModel';
import { useReteachSnapshot } from './useReteachSnapshot';

interface PickerClass {
  id: string;
  name: string;
  member_count?: number;
}

const NAMES_SHOWN = 3;
const splitList = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);

export function ReportsReteachPanel({ classrooms, onShown }: { classrooms: readonly PickerClass[]; onShown?: (classroomId: string | null) => void }) {
  const { t } = useLanguage();
  const state = useReteachSnapshot(classrooms);
  const shownId = state.status === 'ready' ? (state.snapshot?.classroomId ?? null) : null;
  useEffect(() => {
    onShown?.(shownId);
  }, [onShown, shownId]);

  if (state.status === 'loading') return <ReportsReteachLoading />;

  if (state.status === 'error') return null;

  const example = state.snapshot === null;
  const snapshot =
    state.snapshot ??
    exampleSnapshot(
      splitList(t('teacher.reports.reteach.exampleWords', 'thunder,breeze,frost,cloud')),
      splitList(t('teacher.reports.reteach.exampleNames', 'Maya,Leo'))
    );
  const startClassId = example ? classrooms[0]?.id : snapshot.classroomId;

  return (
    <section data-testid="reports-reteach-panel" aria-labelledby="reports-reteach-title" className={cn(REPORT_HERO_PANEL, 'mb-6')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <IconBadge icon={Target} tone="pink" />
        <h2 id="reports-reteach-title" dir="auto" className="min-w-0 font-neo-display text-2xl font-black leading-tight text-edu-ink sm:text-3xl">
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
          <span
            data-testid="reteach-accuracy"
            dir="auto"
            className="whitespace-nowrap max-sm:basis-full max-sm:w-fit sm:ms-auto rounded-full border-2 border-neo-black bg-neo-cyan px-2.5 py-0.5 text-xs font-black tabular-nums text-neo-black shadow-hard-sm sm:text-sm"
          >
            {t('teacher.reports.reteach.accuracy', 'Class accuracy {pct}%', { pct: snapshot.classAccuracy })}
          </span>
        )}
      </div>
      <p dir="auto" className="mt-2 max-w-prose text-sm leading-snug text-edu-ink/85 sm:text-base">
        {example
          ? t(
              'teacher.reports.reteach.exampleBody',
              'After your first game, this shows the words your class missed and who needs help. Sample data below.'
            )
          : t('teacher.reports.reteach.fromClass', 'Words {name} missed most in its games so far.', { name: `\u2068${snapshot.classroomName}\u2069` })}
      </p>

      <ReteachWordRows words={snapshotWords(snapshot.words)} columns noteSingleStudent={!example} />
      <NeedsHelp snapshot={snapshot} example={example} />

      <div className="mt-5">
        <PrimaryAction snapshot={snapshot} example={example} startClassId={startClassId} />
      </div>
    </section>
  );
}

export function ReportsReteachLoading() {
  const { t } = useLanguage();
  return (
    <section data-testid="reports-reteach-panel" aria-busy="true" className={cn(REPORT_HERO_PANEL, 'mb-6 min-h-[22rem]')}>
      <span className="sr-only" role="status">{t('teacher.reports.loadingClassrooms')}</span>
      <div aria-hidden="true" className="h-8 w-56 rounded-neo bg-edu-ink/10 motion-safe:animate-pulse" />
      <div aria-hidden="true" className="mt-4 grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-neo bg-edu-ink/10 motion-safe:animate-pulse" />
        ))}
      </div>
    </section>
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
      <span dir="auto" className="text-sm font-black text-edu-ink">{t('teacher.reports.reteach.needsHelp', 'Needs help:')}</span>
      {snapshot.locked ? (
        <>
          <ProPill label={t('eduLiveRoom.hostResults.proPill', 'Pro')} />
          <span dir="auto" className="text-sm font-bold text-edu-ink/80">
            {t('teacher.reports.reteach.needsHelpPro', 'Student-by-student detail comes with Teacher Pro.')}
          </span>
        </>
      ) : snapshot.needsHelp.length === 0 ? (
        <span dir="auto" className="text-sm font-bold text-edu-ink/80">
          {t('teacher.reports.reteach.needsHelpNone', 'Everyone is at the class goal.')}
        </span>
      ) : names.length === 0 ? (
        <span aria-hidden="true" className="h-7 w-32 rounded-full bg-edu-ink/10 motion-safe:animate-pulse" />
      ) : (
        <>
          {names.slice(0, NAMES_SHOWN).map((name) => (
            <bdi
              key={name}
              data-testid="reteach-needs-help-name"
              className="rounded-full border-2 border-neo-black bg-neo-yellow px-2.5 py-0.5 text-sm font-black text-neo-black shadow-hard-sm"
            >
              {name}
            </bdi>
          ))}
          {extra > 0 ? (
            <span dir="auto" className="text-sm font-bold text-edu-ink/80">
              {t('teacher.reports.reteach.moreStudents', '+{count} more', { count: extra })}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

function PrimaryAction({ snapshot, example, startClassId }: { snapshot: ClassEvidence; example: boolean; startClassId?: string }) {
  const { t } = useLanguage();

  if (!example && !snapshot.locked) {
    return (
      <ReteachPracticeAction
        classroomId={snapshot.classroomId}
        classroomName={snapshot.classroomName}
        words={snapshotWords(snapshot.words).map((w) => w.word)}
        surface="reports"
      />
    );
  }
  if (!startClassId) return null;
  return (
    <ReteachStartGame
      classroomId={startClassId}
      testId="reteach-start-game"
      label={example ? t('teacher.reports.reteach.startFirstGame', 'Start your first game') : t('teacher.reports.emptyClass.cta', 'Start a game with this class')}
    />
  );
}
