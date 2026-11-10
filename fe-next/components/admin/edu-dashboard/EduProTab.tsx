'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import { EduStat } from './EduBars';
import { EduKpiGrid } from './EduKpiGrid';
import { MUTED, PANEL, shortDate, teacherName, useTeacherIndex, type ActiveDrill, type EduDashboardView } from './eduDashboardShared';

export function EduProTab({ data, onDrill }: { data: EduDashboardView; onDrill: (d: ActiveDrill) => void }) {
  const { t, language } = useLanguage();
  const { pro } = data.insights;
  const byId = useTeacherIndex(data.teachers);
  const lapsedLabel = t('admin.eduDashboard.pro.lapsed', 'Trial ended, did not pay');
  const soon = pro.expiringSoon
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => (a.trialExpiresAt ?? '').localeCompare(b.trialExpiresAt ?? ''));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <EduStat testId="pro-paying" label={t('admin.eduDashboard.pro.paying', 'Paying teachers')} value={pro.paying} tone="good" />
        <EduStat testId="pro-active" label={t('admin.eduDashboard.pro.active', 'In a free trial')} value={pro.trialsActive.length} />
        <EduStat
          testId="pro-soon"
          label={t('admin.eduDashboard.pro.soon', 'Trial ends within 7 days')}
          value={pro.expiringSoon.length}
          tone={pro.expiringSoon.length > 0 ? 'warn' : undefined}
        />
        <EduStat
          testId="pro-lapsed"
          label={lapsedLabel}
          value={pro.lapsedUnpaid.length}
          tone={pro.lapsedUnpaid.length > 0 ? 'warn' : undefined}
        />
        <EduStat
          testId="pro-conversion"
          label={t('admin.eduDashboard.pro.conversion', 'Trial to paid')}
          value={pro.conversionPct === null ? null : `${pro.conversionPct}%`}
          hint={t('admin.eduDashboard.pro.conversionHint', 'Of trials that ended or paid.')}
        />
      </div>

      <section className={`${PANEL} space-y-2`}>
        <h3 className="text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.pro.soonTitle', 'Reach out before the trial ends')}</h3>
        {soon.length === 0 ? (
          <p className={`text-sm ${MUTED}`}>{t('admin.eduDashboard.pro.soonNone', 'No trial ends in the next 7 days.')}</p>
        ) : (
          <ul data-testid="pro-soon-list" className="space-y-1 text-sm text-neo-cream">
            {soon.map((x) => (
              <li key={x.id} className="flex flex-wrap justify-between gap-2">
                <Link href={teacherDetailPath(language, x.id)} className="font-semibold hover:underline">
                  {teacherName(x)}
                </Link>
                <span className={`tabular-nums ${MUTED}`}>
                  {t('admin.eduDashboard.pro.endsOn', 'ends {date} · {students} students · {games} games this week', {
                    date: shortDate(x.trialExpiresAt, language),
                    students: x.students,
                    games: x.roundsLast7d ?? '—',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pro.lapsedUnpaid.length > 0 && (
          <button
            type="button"
            className="text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline"
            onClick={() => onDrill({ kind: 'teachers', ids: pro.lapsedUnpaid, title: lapsedLabel })}
          >
            {t('admin.eduDashboard.pro.lapsedShow', 'Show teachers whose trial lapsed ({count})', { count: pro.lapsedUnpaid.length })}
          </button>
        )}
      </section>

      <EduKpiGrid data={data} onDrill={onDrill} only={['trialsStarted', 'trialsPaid']} />
    </div>
  );
}
