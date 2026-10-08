'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { ClassRow, EduDashboard } from '@/lib/admin/eduDashboard';

function ClassName({ row, language }: { row: ClassRow; language: string }) {
  if (!row.teacherId) return <span>{row.name ?? '—'}</span>;
  return (
    <Link href={teacherDetailPath(language, row.teacherId)} className="hover:underline">
      {row.name ?? '—'}
    </Link>
  );
}

export function DyingClassesCard({ rows }: { rows: ClassRow[] }) {
  const { t, language } = useLanguage();
  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.dying.title', 'Dying classes')}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.dying.empty', 'None right now.')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex justify-between">
              <ClassName row={c} language={language} />
              <span className="tabular-nums text-white/60">{c.students}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClassTableCard({ rows }: { rows: ClassRow[] }) {
  const { t, language } = useLanguage();
  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.classes.title', 'Classes')}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.noData', 'No data yet')}</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-white/10">
                <td className="py-1">
                  <ClassName row={c} language={language} />
                </td>
                <td className="py-1 text-right">{c.students}</td>
                <td className="py-1 text-right">{c.roundsInWindow ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ModeMixCard({ rows, roundsAvailable }: { rows: EduDashboard['modeMix']; roundsAvailable: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.modeMix.title', 'Classroom mode mix')}</h3>
      {!roundsAvailable || rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.noData', 'No data yet')}</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <tbody>
            {rows.map((r) => (
              <tr key={r.mode} className="border-t border-white/10">
                <td className="py-1">{r.mode}</td>
                <td className="py-1 text-right">{r.rounds}</td>
                <td className="py-1 text-right text-white/60">{r.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
