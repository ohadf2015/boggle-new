'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassRow, EduDashboard, TeacherRow } from '@/lib/admin/eduDashboard';
import type { FunnelStep, PeriodDelta, TeacherHealth } from '@/lib/admin/eduMetrics';

export function formatDelta(delta: PeriodDelta | null): string | null {
  if (!delta || delta.pct === null) return null;
  const sign = delta.pct > 0 ? '+' : '';
  return `${sign}${delta.pct}%`;
}

export function healthLabel(health: TeacherHealth): string {
  if (health === 'thriving') return 'Thriving';
  if (health === 'at_risk') return 'At risk';
  return 'Dormant';
}

export type EduDashboardView = EduDashboard & { roundsAvailable: boolean };

const HEALTH_CLASS: Record<TeacherHealth, string> = {
  thriving: 'border-emerald-400 text-emerald-300',
  at_risk: 'border-amber-400 text-amber-300',
  dormant: 'border-red-400 text-red-300',
};

export function EduDashboardSections({ data }: { data: EduDashboardView }) {
  return (
    <div className="space-y-6">
      <KpiGrid data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard steps={data.funnel} />
        <ModeMixCard rows={data.modeMix} roundsAvailable={data.roundsAvailable} />
      </div>
      <TeacherTable rows={data.teachers} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DyingClasses rows={data.dyingClasses} />
        <ClassTable rows={data.classes} />
      </div>
    </div>
  );
}

function KpiGrid({ data }: { data: EduDashboardView }) {
  const { t } = useLanguage();
  const k = data.kpis;
  const tiles: Array<{ key: string; label: string; delta: PeriodDelta | null; spark: number[] | null }> = [
    { key: 'activeTeachers', label: t('admin.eduDashboard.kpi.activeTeachers', 'Active teachers'), delta: k.activeTeachers, spark: data.sparklines.activeTeachers },
    { key: 'newTeachers', label: t('admin.eduDashboard.kpi.newTeachers', 'New teachers'), delta: k.newTeachers, spark: null },
    { key: 'classesWithLiveGame', label: t('admin.eduDashboard.kpi.classesWithLiveGame', 'Classes with a live game'), delta: k.classesWithLiveGame, spark: null },
    { key: 'liveRounds', label: t('admin.eduDashboard.kpi.liveRounds', 'Live rounds played'), delta: k.liveRounds, spark: data.sparklines.liveRounds },
    { key: 'trialsStarted', label: t('admin.eduDashboard.kpi.trialsStarted', 'Pro trials started'), delta: k.trialsStarted, spark: null },
    { key: 'trialsPaid', label: t('admin.eduDashboard.kpi.trialsPaid', 'Trials converted to paid'), delta: k.trialsPaid, spark: null },
  ];
  const noData = t('admin.eduDashboard.noData', 'No data yet');

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => {
        const roundsTile = tile.key === 'classesWithLiveGame' || tile.key === 'liveRounds';
        const missing = roundsTile && !data.roundsAvailable;
        const delta = formatDelta(tile.delta);
        return (
          <div key={tile.key} data-testid={`kpi-${tile.key}`} className="rounded border border-white/15 bg-white/5 p-3">
            <p className="text-xs text-white/60">{tile.label}</p>
            {missing || !tile.delta ? (
              <p className="mt-1 text-sm text-white/50">{noData}</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums">{tile.delta.current}</p>
                <p className="text-xs tabular-nums text-white/60">{delta ?? '—'}</p>
              </>
            )}
            {tile.spark && !missing && <Sparkline values={tile.spark} />}
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-6 w-full" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-300" />
    </svg>
  );
}

function FunnelCard({ steps }: { steps: FunnelStep[] }) {
  const { t } = useLanguage();
  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.funnel.title', 'Teacher funnel')}</h3>
      <ol className="space-y-1 text-sm">
        {steps.map((step) => (
          <li
            key={step.key}
            data-testid={`funnel-step-${step.key}`}
            data-drop={step.isBiggestDrop ? 'true' : 'false'}
            className={`flex items-center justify-between rounded px-2 py-1 ${
              step.isBiggestDrop ? 'bg-red-500/20 text-red-200' : ''
            }`}
          >
            <span>{t(`admin.eduDashboard.funnel.${step.key}`, step.key)}</span>
            <span className="tabular-nums">
              {step.count}
              {step.pctOfPrev !== null && <span className="ml-2 text-white/60">{`${step.pctOfPrev}%`}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ModeMixCard({ rows, roundsAvailable }: { rows: EduDashboard['modeMix']; roundsAvailable: boolean }) {
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

function TeacherTable({ rows }: { rows: TeacherRow[] }) {
  const { t, language } = useLanguage();
  return (
    <div className="overflow-x-auto rounded border border-white/15">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-xs text-white/60">
          <tr>
            <th className="p-2">{t('admin.eduDashboard.teachers.name', 'Teacher')}</th>
            <th className="p-2">{t('admin.eduDashboard.teachers.lastActive', 'Last active')}</th>
            <th className="p-2 text-right">{t('admin.eduDashboard.teachers.classes', 'Classes')}</th>
            <th className="p-2 text-right">{t('admin.eduDashboard.teachers.students', 'Students')}</th>
            <th className="p-2 text-right">{t('admin.eduDashboard.teachers.rounds7d', 'Rounds 7d')}</th>
            <th className="p-2">{t('admin.eduDashboard.teachers.health', 'Health')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/10">
              <td className="p-2">{r.name ?? '—'}</td>
              <td className="p-2 text-white/70">
                {r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleDateString(language) : '—'}
              </td>
              <td className="p-2 text-right">{r.classes}</td>
              <td className="p-2 text-right">{r.students}</td>
              <td className="p-2 text-right">{r.roundsLast7d ?? '—'}</td>
              <td className="p-2">
                <span className={`rounded border px-2 py-0.5 text-xs ${HEALTH_CLASS[r.health]}`}>
                  {t(`admin.eduDashboard.health.${r.health}`, healthLabel(r.health))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DyingClasses({ rows }: { rows: ClassRow[] }) {
  const { t } = useLanguage();
  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.dying.title', 'Dying classes')}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t('admin.eduDashboard.dying.empty', 'None right now.')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex justify-between">
              <span>{c.name ?? '—'}</span>
              <span className="tabular-nums text-white/60">{c.students}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClassTable({ rows }: { rows: ClassRow[] }) {
  const { t } = useLanguage();
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
                <td className="py-1">{c.name ?? '—'}</td>
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
