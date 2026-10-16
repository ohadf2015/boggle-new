'use client';

import Link from 'next/link';
import { BarChart3, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import type { ClassroomPlayerMastery } from '@/shared/types/classroom';
import { UnlockReportUpgradeCta } from './UnlockReportUpgradeCta';
import { trackResultsAction } from './trackResultsAction';

export interface StrugglePreviewProps {
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
  teacherName: string;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Bars drawn on the wall; the report has the rest. */
  maxBars?: number;
}

/**
 * The report's shape, on the teacher's wall: one bar per student, weakest first, blurred.
 * It is read by the whole class, so it never prints a name; Pro opens the real report, free gets the gated ask.
 */
export function StrugglePreview({ masteryByPlayer, teacherName, language, t, maxBars = 5 }: StrugglePreviewProps) {
  const { hasPro, loading } = useTeacherPro();
  const host = teacherName.trim().toLowerCase();
  const pcts = Object.entries(masteryByPlayer)
    .filter(([name, m]) => name.trim().toLowerCase() !== host && m && m.total > 0)
    .map(([, m]) => Math.round((m.found / m.total) * 100))
    .sort((a, b) => a - b);
  if (pcts.length === 0) return null;

  return (
    <section
      data-testid="struggle-preview"
      className="flex shrink-0 items-center gap-4 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-3 shadow-hard"
    >
      <ul aria-hidden="true" className="flex w-28 shrink-0 flex-col gap-1.5 blur-[2px] 2xl:w-36">
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
        <p className="flex items-center gap-2 font-neo-display text-base font-black leading-tight text-neo-cream 2xl:text-xl">
          <Lock className="size-4 shrink-0 text-neo-yellow 2xl:size-5" aria-hidden="true" />
          {t('eduPlans.reports.title')}
        </p>
        {hasPro && !loading ? (
          <Link
            href={`/${language}/teacher/reports`}
            data-testid="edu-results-report"
            onClick={() => trackResultsAction('view_report', 'projector')}
            className="inline-flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black bg-neo-cyan px-3 py-1.5 font-neo-body text-sm font-black text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
            {t('education.results.fullReport')}
          </Link>
        ) : (
          <UnlockReportUpgradeCta language={language} t={t} surface="projector" tone="quiet" />
        )}
      </div>
    </section>
  );
}

export default StrugglePreview;
