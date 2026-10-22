'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { ClassRow, EduDashboard } from '@/lib/admin/eduDashboard';
import { classDetailPath, MUTED, PANEL, shortDate, type ActiveDrill } from './eduDashboardShared';
import { DrillBanner } from './EduTeacherTable';

export function ClassTableCard({
  rows,
  drill,
  onClearDrill,
}: {
  rows: ClassRow[];
  drill: ActiveDrill | null;
  onClearDrill: () => void;
}) {
  const { t, language } = useLanguage();
  const ids = drill ? new Set(drill.ids) : null;
  const visible = (ids ? rows.filter((c) => ids.has(c.id)) : rows)
    .slice()
    .sort((a, b) => (b.roundsInWindow ?? 0) - (a.roundsInWindow ?? 0) || b.students - a.students);

  return (
    <section id="edu-class-table" data-testid="class-table" className={`${PANEL} space-y-2`}>
      <h3 className="text-sm font-semibold text-neo-cream">
        {t('admin.eduDashboard.classes.title', 'Classes')}
        <span className={`ms-2 tabular-nums ${MUTED}`}>{rows.length}</span>
      </h3>
      {drill && <DrillBanner drill={drill} onClear={onClearDrill} />}
      {visible.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>{t('admin.eduDashboard.noData', 'No data yet')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums text-neo-cream">
            <thead className={`text-xs ${MUTED}`}>
              <tr>
                <th className="p-2 text-start">{t('admin.eduDashboard.classes.name', 'Class')}</th>
                <th className="p-2 text-start">{t('admin.eduDashboard.teachers.name', 'Teacher')}</th>
                <th className="p-2 text-end">{t('admin.eduDashboard.teachers.students', 'Students')}</th>
                <th className="p-2 text-end">{t('admin.eduDashboard.classes.gamesInWindow', 'Games this period')}</th>
                <th className="p-2 text-start">{t('admin.eduDashboard.classes.lastGame', 'Last game')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t border-neo-cream/10">
                  <td className="p-2">
                    <Link href={classDetailPath(language, c.id)} className="font-semibold hover:underline">
                      {c.name ?? t('admin.eduClass.unnamed', '(unnamed)')}
                    </Link>
                  </td>
                  <td className="p-2">
                    {c.teacherId ? (
                      <Link href={teacherDetailPath(language, c.teacherId)} className={`${MUTED} hover:underline`}>
                        {c.teacherName ?? '—'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2 text-end">{c.students}</td>
                  <td className="p-2 text-end">{c.roundsInWindow ?? '—'}</td>
                  <td className={`p-2 ${MUTED}`}>{shortDate(c.lastRoundAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ModeMixCard({ rows, roundsAvailable }: { rows: EduDashboard['modeMix']; roundsAvailable: boolean }) {
  const { t } = useLanguage();
  return (
    <section className={PANEL}>
      <h3 className="mb-2 text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.modeMix.title', 'Which games classes play')}</h3>
      {!roundsAvailable || rows.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>{t('admin.eduDashboard.noData', 'No data yet')}</p>
      ) : (
        <table className="w-full text-sm tabular-nums text-neo-cream">
          <thead className={`text-xs ${MUTED}`}>
            <tr>
              <th className="p-1 text-start">{t('admin.eduDashboard.modeMix.mode', 'Game mode')}</th>
              <th className="p-1 text-end">{t('admin.eduDashboard.modeMix.rounds', 'Games')}</th>
              <th className="p-1 text-end">{t('admin.eduDashboard.modeMix.players', 'Player seats')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mode} className="border-t border-neo-cream/10">
                <td className="p-1">{r.mode}</td>
                <td className="p-1 text-end">{r.rounds}</td>
                <td className={`p-1 text-end ${MUTED}`}>{r.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
