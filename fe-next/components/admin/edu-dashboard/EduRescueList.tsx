'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { EduVerdict } from '@/lib/admin/eduDashboard';
import { EduRescueRow } from './EduRescueRow';

const HINT_FALLBACK: Record<string, string> = {
  approved: 'Nudge to create a class',
  classroom: 'Send the join code',
};

export function EduRescueList({ verdict }: { verdict: EduVerdict | null }) {
  const { t } = useLanguage();
  const rows = verdict?.rescue ?? [];
  const more = (verdict?.rescueTotal ?? 0) - rows.length;
  const hint = verdict ? t(`admin.eduDashboard.rescue.rowAction.${verdict.fromKey}`, HINT_FALLBACK[verdict.fromKey] ?? '') : '';

  return (
    <section data-testid="rescue-list" aria-labelledby="edu-rescue-title" className="rounded border border-white/15 p-3">
      <h3 id="edu-rescue-title" className="flex items-baseline justify-between text-sm font-semibold">
        <span>{t('admin.eduDashboard.rescue.title', 'Rescue list')}</span>
        <span className="tabular-nums text-white/60">{verdict?.rescueTotal ?? 0}</span>
      </h3>
      {hint && rows.length > 0 && <p className="mb-1 text-xs text-cyan-200">{hint}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.rescue.empty', 'No one is stuck at this step.')}</p>
      ) : (
        <ol className="divide-y divide-white/10">
          {rows.map((r, i) => (
            <EduRescueRow key={r.id} index={i} row={r} />
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
