'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { EduVerdict } from '@/lib/admin/eduDashboard';
import { HealthChip, shortDate } from './eduDashboardShared';

const ROW_ACTION_FALLBACK: Record<string, string> = {
  approved: 'Nudge to create a class',
  classroom: 'Send the join code',
};

export function EduRescueList({ verdict }: { verdict: EduVerdict | null }) {
  const { t, language } = useLanguage();
  const rows = verdict?.rescue ?? [];
  const more = (verdict?.rescueTotal ?? 0) - rows.length;
  const rowAction = verdict
    ? t(`admin.eduDashboard.rescue.rowAction.${verdict.fromKey}`, ROW_ACTION_FALLBACK[verdict.fromKey] ?? '')
    : '';

  return (
    <section data-testid="rescue-list" aria-labelledby="edu-rescue-title" className="rounded border border-white/15 p-3">
      <h3 id="edu-rescue-title" className="mb-2 flex items-baseline justify-between text-sm font-semibold">
        <span>{t('admin.eduDashboard.rescue.title', 'Rescue list')}</span>
        <span className="tabular-nums text-white/60">{verdict?.rescueTotal ?? 0}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.rescue.empty', 'No one is stuck at this step.')}</p>
      ) : (
        <ol className="divide-y divide-white/10">
          {rows.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-5 text-right tabular-nums text-white/50">{i + 1}</span>
              <Link
                href={teacherDetailPath(language, r.id)}
                className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                {r.name ?? '—'}
              </Link>
              <HealthChip health={r.health} />
              <span className="text-xs tabular-nums text-white/60">{shortDate(r.lastActiveAt, language)}</span>
              <span className="w-full pl-8 text-xs text-cyan-200">{rowAction}</span>
            </li>
          ))}
        </ol>
      )}
      {more > 0 && (
        <p data-testid="rescue-more" className="mt-2 text-xs text-white/60">
          {`+${more} ${t('admin.eduDashboard.rescue.more', 'more in All teachers below')}`}
        </p>
      )}
    </section>
  );
}
