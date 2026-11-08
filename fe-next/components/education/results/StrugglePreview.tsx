'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import type { ClassroomPlayerMastery } from '@/shared/types/classroom';
import { trackResultsAction } from './trackResultsAction';
import { RoundWordGridDialog } from './RoundWordGridDialog';
import type { RoundWordGridInput } from './roundWordGrid';

export interface StrugglePreviewProps {
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
  teacherName: string;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Bars drawn on the wall; the report has the rest. */
  maxBars?: number;
  /** This round's coverage, for the word-by-student grid. */
  round?: RoundWordGridInput;
}

/** A Pro teacher's door to the class report. Read by the whole class, so it never prints a name. */
export function StrugglePreview({ masteryByPlayer, teacherName, language, t, maxBars = 5, round }: StrugglePreviewProps) {
  const { hasPro, loading } = useTeacherPro();
  const [gridOpen, setGridOpen] = useState(false);
  const closeGrid = useCallback(() => setGridOpen(false), []);
  const host = teacherName.trim().toLowerCase();
  const pcts = Object.entries(masteryByPlayer)
    .filter(([name, m]) => name.trim().toLowerCase() !== host && m && m.total > 0)
    .map(([, m]) => Math.round((m.found / m.total) * 100))
    .sort((a, b) => a - b);
  if (pcts.length === 0 || loading || !hasPro) return null;

  return (
    <section
      data-testid="struggle-preview"
      className="flex shrink-0 items-center gap-3 rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light px-3 py-2 shadow-hard-xl @lg/results:gap-4 @lg/results:px-4 @lg/results:py-3"
    >
      <ul aria-hidden="true" className="flex w-24 shrink-0 flex-col gap-1 @lg/results:w-36 @lg/results:gap-1.5">
        {pcts.slice(0, maxBars).map((pct, i) => (
          <li key={i} data-testid="struggle-bar" data-pct={String(pct)} className="flex items-center gap-1.5">
            <span className="h-2 w-6 shrink-0 rounded-sm bg-neo-cream/50 @lg/results:h-2.5 @lg/results:w-8" />
            <span className="h-2 flex-1 overflow-hidden rounded-sm bg-neo-navy @lg/results:h-2.5">
              <span
                className="block h-full origin-left bg-neo-cream rtl:origin-right"
                style={{ transform: `scaleX(${Math.max(0.06, pct / 100)})` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <div className="flex min-w-0 flex-col items-start gap-2">
        <p className="font-neo-display text-base font-black leading-tight text-neo-cream @[96rem]/results:text-xl">
          {t('eduPlans.reports.title')}
        </p>
        <Link
          href={`/${language}/teacher/reports`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="edu-results-report"
          onClick={() => trackResultsAction('view_report', 'projector')}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 font-neo-display text-sm font-black text-neo-black shadow-hard-lg transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan @[96rem]/results:min-h-14 @[96rem]/results:text-lg"
        >
          <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
          {t('education.results.fullReport')}
        </Link>
        {round && (round.coverage?.length ?? 0) > 0 ? (
          <>
            <button
              type="button"
              data-testid="struggle-open-grid"
              onClick={() => setGridOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-black bg-neo-cream px-3 font-neo-display text-sm font-black text-neo-black shadow-hard-lg transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan @[96rem]/results:min-h-14 @[96rem]/results:text-lg"
            >
              <Table2 className="size-4 shrink-0" aria-hidden="true" />
              {t('eduProResults.openGrid')}
            </button>
            <p data-testid="struggle-open-grid-note" className="text-xs font-semibold text-neo-cream/80 @[96rem]/results:text-sm">
              {t('eduProResults.openGridNote')}
            </p>
          </>
        ) : null}
      </div>
      {gridOpen && round ? (
        <RoundWordGridDialog language={language} round={round} offer={null} upsell={false} onClose={closeGrid} />
      ) : null}
    </section>
  );
}

export default StrugglePreview;
