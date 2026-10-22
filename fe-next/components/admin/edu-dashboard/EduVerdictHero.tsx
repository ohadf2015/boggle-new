'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EduDrill, EduVerdict, FunnelKey } from '@/lib/admin/eduDashboard';
import { FUNNEL_LABEL_FALLBACK, MUTED, teacherAccessPath, type ActiveDrill } from './eduDashboardShared';
import { useCountUp } from './useCountUp';

const LABEL_FALLBACK: Record<string, string> = {
  approved: 'applicants were never approved',
  signin: 'approved teachers cannot sign in: the teacher role was never granted',
  classroom: 'teachers can sign in but never made a class',
  student: 'teachers made a class but no student has joined yet',
};

const ACTION_FALLBACK: Record<string, string> = {
  approved: 'Work through the pending requests in Teacher access.',
  signin: 'Grant the teacher role in Teacher access.',
  classroom: 'Nudge them to create their first class.',
  student: 'Send the join code to these teachers, most recently active first.',
};

export function EduVerdictHero({
  verdict,
  drill,
  onDrill,
}: {
  verdict: EduVerdict | null;
  drill: EduDrill['funnel'];
  onDrill: (drill: ActiveDrill) => void;
}) {
  const { t, language } = useLanguage();
  const lost = useCountUp(verdict?.lost ?? 0);

  if (!verdict) {
    return (
      <section className={`rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 text-sm ${MUTED}`}>
        {t('admin.eduDashboard.verdict.none', 'Not enough data in this window yet.')}
      </section>
    );
  }

  const step = verdict.stepKey;
  const stepLabel = t(`admin.eduDashboard.funnel.${step}`, FUNNEL_LABEL_FALLBACK[step] ?? step);
  const fromLabel = t(`admin.eduDashboard.funnel.${verdict.fromKey}`, FUNNEL_LABEL_FALLBACK[verdict.fromKey] ?? verdict.fromKey);
  const cohort = drill[verdict.fromKey as FunnelKey] ?? [];
  const cta = 'rounded border-2 border-neo-cream bg-neo-cream px-3 py-1.5 text-sm font-semibold text-neo-navy hover:opacity-90 focus-visible:outline-2 focus-visible:outline-neo-cyan';

  return (
    <section
      aria-label={t('admin.eduDashboard.verdict.eyebrow', 'Biggest drop-off')}
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-neo border-2 border-neo-red bg-neo-red/10 p-4 text-neo-cream"
    >
      <div className="flex items-center gap-4">
        <span data-testid="verdict-lost" className="text-5xl font-extrabold tabular-nums text-neo-white">
          {lost}
        </span>
        <div>
          <p data-testid="verdict-eyebrow" className="text-xs uppercase tracking-wide text-neo-cream/80">
            {t('admin.eduDashboard.verdict.eyebrow', 'Biggest drop-off')}
            {` · ${stepLabel}`}
          </p>
          <p className="text-lg font-bold">{t(`admin.eduDashboard.verdict.label.${step}`, LABEL_FALLBACK[step] ?? step)}</p>
        </div>
      </div>
      <div className="min-w-[14rem] flex-1 text-sm">
        <p>{t(`admin.eduDashboard.verdict.action.${step}`, ACTION_FALLBACK[step] ?? '')}</p>
        {verdict.pct !== null && (
          <p className={`mt-1 text-xs tabular-nums ${MUTED}`}>
            {t('admin.eduDashboard.verdict.convert', 'Only {pct}% of "{from}" reach "{to}".', {
              pct: verdict.pct,
              from: fromLabel,
              to: stepLabel,
            })}
          </p>
        )}
      </div>
      {verdict.cohortAvailable && cohort.length > 0 ? (
        <button
          type="button"
          className={cta}
          onClick={() =>
            onDrill({
              kind: 'teachers',
              ids: cohort,
              title: t('admin.eduDashboard.drill.stoppedAt', 'Stopped at: {step}', { step: fromLabel }),
            })
          }
        >
          {t('admin.eduDashboard.verdict.seeCohort', 'See these {count} teachers', { count: cohort.length })}
        </button>
      ) : !verdict.cohortAvailable ? (
        <Link href={teacherAccessPath(language)} className={cta}>
          {t('admin.eduDashboard.verdict.openAccess', 'Open Teacher access')}
        </Link>
      ) : null}
    </section>
  );
}
