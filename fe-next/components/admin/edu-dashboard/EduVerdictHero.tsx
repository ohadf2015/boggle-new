'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EduVerdict } from '@/lib/admin/eduDashboard';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import { FUNNEL_LABEL_FALLBACK } from './eduDashboardShared';
import { useCountUp } from './useCountUp';

const LABEL_FALLBACK: Record<string, string> = {
  approved: 'access requests were never approved',
  classroom: 'approved teachers never made a class',
  student: 'teachers made a class but no student has joined yet',
};

const ACTION_FALLBACK: Record<string, string> = {
  approved: 'Work through the pending requests in Teacher access.',
  classroom: 'Nudge them to create their first class.',
  student: 'Send the join code to these teachers, most recently active first.',
};

export function EduVerdictHero({ verdict }: { verdict: EduVerdict | null }) {
  const { t, language } = useLanguage();
  const lost = useCountUp(verdict?.lost ?? 0);

  if (!verdict) {
    return (
      <section className="rounded border-2 border-white/15 bg-white/5 p-4 text-sm text-white/60">
        {t('admin.eduDashboard.verdict.none', 'Not enough data in this window yet.')}
      </section>
    );
  }

  const step = verdict.stepKey;
  const top = verdict.rescue[0];
  const stepLabel = t(`admin.eduDashboard.funnel.${step}`, FUNNEL_LABEL_FALLBACK[step] ?? step);

  return (
    <section
      aria-label={t('admin.eduDashboard.verdict.eyebrow', 'Biggest leak')}
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded border-2 border-red-400/60 bg-red-500/10 p-4"
    >
      <div className="flex items-center gap-4">
        <span
          data-testid="verdict-lost"
          className="text-5xl font-extrabold tabular-nums text-red-200"
        >
          {lost}
        </span>
        <div>
          <p data-testid="verdict-eyebrow" className="text-xs uppercase tracking-wide text-red-200/80">
            {t('admin.eduDashboard.verdict.eyebrow', 'Biggest leak')}
            {` · ${stepLabel}`}
          </p>
          <p className="text-lg font-bold">
            {t(`admin.eduDashboard.verdict.label.${step}`, LABEL_FALLBACK[step] ?? step)}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-white/85">
          {t(`admin.eduDashboard.verdict.action.${step}`, ACTION_FALLBACK[step] ?? '')}
        </p>
        {verdict.pct !== null && (
          <p className="mt-1 text-xs tabular-nums text-white/60">
            <span>{`${verdict.pct}%`}</span>{' '}
            {t('admin.eduDashboard.verdict.convert', 'reach this step')}
          </p>
        )}
      </div>
      {top && (
        <Link
          href={teacherDetailPath(language, top.id)}
          className="rounded border border-white bg-white px-3 py-1.5 text-sm font-semibold text-black hover:opacity-90"
        >
          {t('admin.eduDashboard.verdict.openTop', 'Open top teacher')}
        </Link>
      )}
    </section>
  );
}
