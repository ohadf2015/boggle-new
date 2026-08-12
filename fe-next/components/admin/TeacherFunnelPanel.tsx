'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { AlertTriangle } from 'lucide-react';
import type { TeacherFunnelResult, TeacherFunnelRow, TeacherStage } from '@/lib/education/teacherFunnel';

const STAGE_STYLE: Record<TeacherStage, string> = {
  blocked: 'bg-neo-red text-neo-white',
  declined: 'bg-neo-navy-light text-neo-white/60',
  awaiting_signup: 'bg-neo-navy-light text-neo-white/80',
  approved: 'bg-neo-cyan text-black',
  created_class: 'bg-neo-purple text-neo-white',
  teaching: 'bg-neo-lime text-black',
};

const TRIAL_STYLE: Record<string, string> = {
  active: 'text-neo-lime',
  expired: 'text-neo-orange',
  none: 'text-neo-white/40',
};

/** "12d ago" scans faster than a date when the question is "did they come back?". */
function daysAgo(iso: string | null, t: (k: string, v?: Record<string, string>) => string) {
  if (!iso) return t('admin.teacherFunnel.lastSeen.never');
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return t('admin.teacherFunnel.lastSeen.never');
  if (days <= 0) return t('admin.teacherFunnel.lastSeen.today');
  return t('admin.teacherFunnel.lastSeen.daysAgo', { days: String(days) });
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div
      className={`rounded-neo border-neo px-3 py-2 shadow-hard-sm ${
        alert ? 'border-black bg-neo-red text-neo-white' : 'border-black bg-neo-cream text-black'
      }`}
    >
      <div className="font-neo-display text-2xl font-black leading-none">{value}</div>
      <div className="mt-1 font-neo-body text-[11px] font-bold uppercase opacity-70">{label}</div>
    </div>
  );
}

export function TeacherFunnelPanel() {
  const { t } = useLanguage();
  const [data, setData] = useState<TeacherFunnelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/teacher-funnel');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(null);
    } catch {
      setError(t('admin.teacherFunnel.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-4 font-neo-body text-neo-white/60">{t('common.loading')}</div>;
  if (error) return <div className="p-4 font-neo-body text-neo-red">{error}</div>;
  if (!data) return null;

  const { summary, rows } = data;

  return (
    <section className="p-4">
      <h2 className="font-neo-display text-xl font-black text-neo-white">{t('admin.teacherFunnel.title')}</h2>
      <p className="mt-1 font-neo-body text-sm text-neo-white/60">{t('admin.teacherFunnel.subtitle')}</p>

      {/* The invariant that silently broke for two months. Loud, not buried in a column. */}
      {summary.blocked > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-neo border-neo border-black bg-neo-red p-3 text-neo-white shadow-hard">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-neo-body text-sm font-bold">
            {t('admin.teacherFunnel.blockedAlert', { count: String(summary.blocked) })}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('admin.teacherFunnel.stat.requested')} value={summary.requested} />
        <Stat label={t('admin.teacherFunnel.stat.approved')} value={summary.approved} />
        <Stat
          label={t('admin.teacherFunnel.stat.roleGranted')}
          value={summary.roleGranted}
          alert={summary.blocked > 0}
        />
        <Stat label={t('admin.teacherFunnel.stat.createdClassroom')} value={summary.createdClassroom} />
        <Stat label={t('admin.teacherFunnel.stat.gotStudents')} value={summary.gotStudents} />
        <Stat label={t('admin.teacherFunnel.stat.assigned')} value={summary.assigned} />
      </div>

      {/* Wide table on a narrow phone: scroll the table, never the page. */}
      <div className="mt-4 overflow-x-auto rounded-neo border-neo border-black bg-neo-navy-light">
        <table className="w-full min-w-[720px] text-start font-neo-body text-sm">
          <thead>
            <tr className="border-b border-black/40 text-[11px] uppercase text-neo-white/50">
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.teacher')}</th>
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.country')}</th>
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.stage')}</th>
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.trial')}</th>
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.lastSeen')}</th>
              <th className="p-2 text-end font-bold">{t('admin.teacherFunnel.col.classes')}</th>
              <th className="p-2 text-end font-bold">{t('admin.teacherFunnel.col.students')}</th>
              <th className="p-2 text-end font-bold">{t('admin.teacherFunnel.col.assignments')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-neo-white/50">
                  {t('admin.teacherFunnel.empty')}
                </td>
              </tr>
            )}
            {rows.map((r: TeacherFunnelRow) => (
              <tr key={r.requestId} className="border-b border-black/20 text-neo-white/90">
                <td className="p-2">
                  <div className="font-bold">{r.fullName || r.email}</div>
                  <div className="text-xs text-neo-white/50">{r.email}</div>
                </td>
                <td className="p-2 text-neo-white/70">
                  {r.country || '—'}
                  <span className="ms-1 text-xs text-neo-white/40">{r.locale}</span>
                </td>
                <td className="p-2">
                  <span
                    className={`inline-block rounded-neo border border-black px-2 py-0.5 text-[11px] font-black uppercase ${STAGE_STYLE[r.stage]}`}
                  >
                    {t(`admin.teacherFunnel.stage.${r.stage}`)}
                  </span>
                </td>
                <td className={`p-2 text-xs font-bold ${TRIAL_STYLE[r.trialState]}`}>
                  {t(`admin.teacherFunnel.trial.${r.trialState}`)}
                </td>
                <td className="p-2 text-xs text-neo-white/70">{daysAgo(r.lastSeenAt, t)}</td>
                <td className="p-2 text-end tabular-nums">{r.classrooms}</td>
                <td className="p-2 text-end tabular-nums">{r.students}</td>
                <td className="p-2 text-end tabular-nums">{r.assignments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 font-neo-body text-xs text-neo-white/40">{t('admin.teacherFunnel.pageviewHint')}</p>
    </section>
  );
}
