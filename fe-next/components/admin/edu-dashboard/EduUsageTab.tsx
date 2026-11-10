'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import { Bars, EduStat } from './EduBars';
import { ModeMixCard } from './EduClassCards';
import { MUTED, PANEL, teacherName, useTeacherIndex, weekdayLabels, type ActiveDrill, type EduDashboardView } from './eduDashboardShared';

export function EduUsageTab({ data, onDrill }: { data: EduDashboardView; onDrill: (d: ActiveDrill) => void }) {
  const { t, language } = useLanguage();
  const { usage, retention, classSizes } = data.insights;
  const weekdays = useMemo(() => weekdayLabels(language, 'short'), [language]);
  const teachers = useTeacherIndex(data.teachers);

  if (!data.roundsAvailable || !usage || !retention) {
    return (
      <p className={`${PANEL} text-sm ${MUTED}`}>
        {t('admin.eduDashboard.notMeasured', 'Not measured yet: the class games table is missing in this database.')}
      </p>
    );
  }

  const dayLabel = (i: number) => `-${usage.dailyPlayers.length - 1 - i}d`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EduStat testId="usage-rounds" label={t('admin.eduDashboard.usage.rounds', 'Class games')} value={usage.rounds} />
        <EduStat testId="usage-players" label={t('admin.eduDashboard.usage.players', 'Student seats filled')} value={usage.players} />
        <EduStat
          testId="usage-avg"
          label={t('admin.eduDashboard.usage.avg', 'Students per game')}
          value={usage.avgPlayersPerRound}
          hint={t('admin.eduDashboard.usage.avgHint', 'A low number means teachers play with few students.')}
        />
        <EduStat
          testId="usage-retention"
          label={t('admin.eduDashboard.usage.retention', 'Teachers who came back')}
          value={retention.pct === null ? null : `${retention.pct}%`}
          tone={retention.pct !== null && retention.pct < 40 ? 'warn' : 'good'}
          hint={t('admin.eduDashboard.usage.retentionHint', '{returned} of {prior} who taught in the previous period taught again. {fresh} started teaching.', {
            returned: retention.returned,
            prior: retention.priorTeachers,
            fresh: retention.newlyTeaching,
          })}
        />
      </div>
      {retention.lostIds.length > 0 && (
        <button
          type="button"
          onClick={() => onDrill({ kind: 'teachers', ids: retention.lostIds, title: t('admin.eduDashboard.usage.lost', 'Taught last period, silent now') })}
          className="text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline"
        >
          {t('admin.eduDashboard.usage.lostShow', 'Show the {count} teachers who stopped', { count: retention.lostIds.length })}
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={PANEL}>
          <h3 className="mb-2 text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.usage.dailyTitle', 'Students playing, day by day')}</h3>
          <Bars
            testId="usage-daily"
            ariaLabel={t('admin.eduDashboard.usage.dailyTitle', 'Students playing, day by day')}
            bars={usage.dailyPlayers.map((value, i) => ({ label: dayLabel(i), value }))}
          />
        </section>
        <section className={PANEL}>
          <h3 className="mb-2 text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.usage.weekdayTitle', 'Which days teachers teach')}</h3>
          <Bars
            testId="usage-weekday"
            ariaLabel={t('admin.eduDashboard.usage.weekdayTitle', 'Which days teachers teach')}
            bars={usage.byWeekday.map((value, i) => ({ label: weekdays[i], value, highlight: i === usage.peakWeekday }))}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={PANEL}>
          <h3 className="mb-2 text-sm font-semibold text-neo-cream">
            {t('admin.eduDashboard.usage.sizeTitle', 'Class sizes')}
            {classSizes.avgStudents !== null && (
              <span className={`ms-2 text-xs font-normal ${MUTED}`}>
                {t('admin.eduDashboard.usage.sizeAvg', 'average {n} students', { n: classSizes.avgStudents })}
              </span>
            )}
          </h3>
          <Bars
            testId="usage-sizes"
            ariaLabel={t('admin.eduDashboard.usage.sizeTitle', 'Class sizes')}
            bars={classSizes.buckets.map((b) => ({ label: b.key === 'empty' ? t('admin.eduDashboard.usage.empty', 'empty') : b.key, value: b.count }))}
          />
        </section>
        <ModeMixCard rows={data.modeMix} roundsAvailable={data.roundsAvailable} />
        <section className={PANEL}>
          <h3 className="mb-2 text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.usage.topTitle', 'Most active teachers')}</h3>
          {usage.topTeachers.length === 0 ? (
            <p className={`text-sm ${MUTED}`}>{t('admin.eduDashboard.noData', 'No data yet')}</p>
          ) : (
            <ol data-testid="usage-top" className="space-y-1 text-sm text-neo-cream">
              {usage.topTeachers.map((x) => (
                <li key={x.teacherId} className="flex justify-between gap-2">
                  <Link href={teacherDetailPath(language, x.teacherId)} className="truncate font-semibold hover:underline">
                    {teachers.has(x.teacherId) ? teacherName(teachers.get(x.teacherId)!) : x.teacherId}
                  </Link>
                  <span className={`shrink-0 tabular-nums ${MUTED}`}>
                    {t('admin.eduDashboard.usage.topRow', '{rounds} games, {players} seats', { rounds: x.rounds, players: x.players })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
