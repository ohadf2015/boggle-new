'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import type { ClassroomPlayerMastery } from '@/shared/types/classroom';
import { trackResultsAction } from './trackResultsAction';

export interface StrugglePreviewProps {
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
  teacherName: string;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Bars drawn on the wall; the report has the rest. */
  maxBars?: number;
}

/** A Pro teacher's door to the class report. Read by the whole class, so it never prints a name. */
export function StrugglePreview({ masteryByPlayer, teacherName, language, t, maxBars = 5 }: StrugglePreviewProps) {
  const { hasPro, loading } = useTeacherPro();
  const host = teacherName.trim().toLowerCase();
  const pcts = Object.entries(masteryByPlayer)
    .filter(([name, m]) => name.trim().toLowerCase() !== host && m && m.total > 0)
    .map(([, m]) => Math.round((m.found / m.total) * 100))
    .sort((a, b) => a - b);
  if (pcts.length === 0 || loading || !hasPro) return null;

  return (
    <section
      data-testid="struggle-preview"
      className="flex shrink-0 items-center gap-4 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-3 shadow-hard"
    >
      <ul aria-hidden="true" className="flex w-28 shrink-0 flex-col gap-1.5 @lg/results:w-36">
        {pcts.slice(0, maxBars).map((pct, i) => (
          <li key={i} data-testid="struggle-bar" data-pct={String(pct)} className="flex items-center gap-1.5">
            <span className="h-2.5 w-8 shrink-0 rounded-full bg-neo-cream/50" />
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neo-navy">
              <span
                className={cn('block h-full origin-left rounded-full rtl:origin-right', pct < 40 ? 'bg-neo-pink' : pct < 70 ? 'bg-neo-yellow' : 'bg-neo-lime')}
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
          data-testid="edu-results-report"
          onClick={() => trackResultsAction('view_report', 'projector')}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[2px] border-neo-cream/60 px-3 font-neo-display text-sm font-black uppercase text-neo-cream hover:bg-neo-navy-light"
        >
          <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
          {t('education.results.fullReport')}
        </Link>
      </div>
    </section>
  );
}

export default StrugglePreview;
