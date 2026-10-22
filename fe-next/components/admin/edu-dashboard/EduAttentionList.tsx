'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { TeacherRow } from '@/lib/admin/eduDashboard';
import type { AttentionList } from '@/lib/admin/eduAttention';
import { EduAttentionRow } from './EduAttentionRow';
import { MUTED, PANEL } from './eduDashboardShared';

export function EduAttentionList({ attention, teachers }: { attention: AttentionList; teachers: TeacherRow[] }) {
  const { t } = useLanguage();
  const rowOf = new Map(teachers.map((r) => [r.id, r]));
  const items = attention.items.filter((i) => rowOf.has(i.teacherId));
  const more = attention.total - items.length;

  return (
    <section data-testid="rescue-list" aria-labelledby="edu-attention-title" className={PANEL}>
      <h3 id="edu-attention-title" className="flex items-baseline justify-between text-sm font-semibold text-neo-cream">
        <span>{t('admin.eduDashboard.attention.title', 'Needs attention')}</span>
        <span className={`tabular-nums ${MUTED}`}>{attention.total}</span>
      </h3>
      <p className={`text-xs ${MUTED}`}>
        {t('admin.eduDashboard.attention.hint', 'Most urgent first: sign-in problems, trials about to end, then teachers stuck at a step.')}
      </p>
      {items.length === 0 ? (
        <p className={`mt-2 text-sm ${MUTED}`}>{t('admin.eduDashboard.attention.empty', 'Nobody needs a nudge right now.')}</p>
      ) : (
        <ol className="divide-y divide-neo-cream/10">
          {items.map((item, i) => (
            <EduAttentionRow key={item.teacherId} index={i} row={rowOf.get(item.teacherId)!} item={item} />
          ))}
        </ol>
      )}
      {more > 0 && (
        <p data-testid="rescue-more" className={`mt-2 text-xs ${MUTED}`}>
          {t('admin.eduDashboard.attention.more', '+{count} more. Use the funnel or the teacher list below to see them.', { count: more })}
        </p>
      )}
    </section>
  );
}
