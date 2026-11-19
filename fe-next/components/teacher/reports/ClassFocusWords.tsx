'use client';

import { Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResultsSurface } from '@/components/education/results/trackResultsAction';
import { PANEL_TITLE } from '@/components/teacher/analytics/overview/overviewParts';
import { pct } from '@/components/teacher/analytics/overview/overviewModel';
import { IconBadge, ReteachPracticeAction, ReteachStartGame, ReteachWordRows, snapshotWords } from './reteachParts';
import { useWordMasteryReport } from './useWordMasteryReport';

interface FallbackWord {
  word: string;
  errorRate: number;
  studentCount: number;
}

const FALLBACK_SHOWN = 4;

/** "Which words" and the page's one main action. Practice is offered only on words the assign endpoint will accept. */
export function ClassFocusWords({
  classroomId,
  classroomName,
  fallback,
  surface,
}: {
  classroomId: string;
  classroomName: string;
  fallback: readonly FallbackWord[];
  surface: ResultsSurface;
}) {
  const { t } = useLanguage();
  const state = useWordMasteryReport(classroomId);

  if (state.status === 'loading') {
    return <div data-testid="class-focus-loading" aria-busy="true" className="h-48 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />;
  }

  const words = state.status === 'ready' ? snapshotWords(state.report.hardestWords) : [];
  const title = (
    <div className="flex items-center gap-2.5">
      <IconBadge icon={Target} tone="pink" />
      <h2 className={PANEL_TITLE}>{t('education.analytics.overview.hardWordsTitle')}</h2>
    </div>
  );

  if (words.length > 0) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          {title}
          <ReteachWordRows words={words} />
        </div>
        <ReteachPracticeAction classroomId={classroomId} classroomName={classroomName} words={words.map((w) => w.word)} surface={surface} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {fallback.length > 0 ? (
        <div>
          {title}
          <ul className="mt-2">
            {fallback.slice(0, FALLBACK_SHOWN).map((m) => (
              <li key={m.word} className="flex items-baseline justify-between gap-3 border-b-2 border-neo-cream/15 py-2 max-sm:[&:nth-child(n+4)]:hidden">
                <bdi className="min-w-0 truncate font-neo-display text-xl font-black text-neo-white">{m.word}</bdi>
                <span className="shrink-0 font-neo-body text-xs font-bold text-neo-cream/70">
                  {t('education.analytics.overview.hardWordsMeta', { count: m.studentCount, pct: pct(m.errorRate) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ReteachStartGame classroomId={classroomId} testId="class-focus-start" label={t('teacher.reports.emptyClass.cta', 'Start a game with this class')} />
    </div>
  );
}
