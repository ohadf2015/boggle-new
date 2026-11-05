'use client';

/**
 * Per-student assignment progress matrix (Teacher Pro): one row per roster
 * student, one cell per assignment (completed + correctness), with a
 * per-student correctness trend. Gated twice:
 *
 * 1. HERE — the same entitlement rule ProGate uses (useTeacherPro +
 *    teacherTrialStatus): a paid teacher or a live access trial sees the
 *    report; a free teacher or an expired trial sees the paywall, and the
 *    per-student fetch to the gated route never fires for them.
 * 2. SERVER — /api/education/classroom/[id]/assignment-progress refuses
 *    401/403/402 before reading a single student row, so a stale client
 *    entitlement (trial expired mid-session) still gets a paywall, never rows.
 *
 * Paywall telemetry is additive and mirrors the ProGate pair: pro_gate_shown
 * on the lock, upgrade_clicked on the primary CTA, then the existing
 * useTeacherProCheckout chain (postTeacherProCheckout -> goToPolarCheckout).
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Lock, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { teacherTrialStatus } from '@/lib/education/trial';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { PRO_COPY_PARAMS } from '@/lib/education/proFeatures';
import { rememberCheckoutOrigin } from '@/lib/education/checkoutReturn';
import {
  trackProgressReportGateShown,
  trackProgressReportUpgradeClicked,
  trackProgressReportViewed,
} from '@/lib/education/telemetry';
import type { AssignmentProgressMatrix as AssignmentProgressMatrixData } from '@/lib/education/assignmentProgressMatrix';
import { SAMPLE_STUDENTS, splitSampleList } from '@/lib/education/pro/sampleClass';
import { ReportEmpty, ReportError, ReportSkeleton, SectionTitle, useReportData } from './ReportChrome';

export interface AssignmentProgressMatrixProps {
  classroomId: string;
  classroomName: string;
}

type MatrixPayload = { kind: 'matrix'; matrix: AssignmentProgressMatrixData } | { kind: 'paywall' };

export function AssignmentProgressMatrix({ classroomId, classroomName }: AssignmentProgressMatrixProps) {
  const { hasPro, loading, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  // Same rule as ProGate: an unexpired access trial opens the surface.
  const trial = teacherTrialStatus(accessTrialExpires, nowMs);
  const entitled = hasPro || (trial !== null && !trial.isExpired);

  if (loading) return <ReportSkeleton />;
  if (!entitled) {
    return <MatrixPaywall trialEnded={accessTrialEnded === true || trial?.isExpired === true} />;
  }
  return <MatrixReport classroomId={classroomId} classroomName={classroomName} />;
}

/** Fetch + render for an entitled teacher. A 402 (stale entitlement) degrades to the paywall. */
function MatrixReport({ classroomId, classroomName }: AssignmentProgressMatrixProps) {
  const load = useCallback(async (): Promise<{ data: MatrixPayload | null; error: { message: string } | null }> => {
    const res = await fetch(`/api/education/classroom/${classroomId}/assignment-progress`, {
      credentials: 'same-origin',
    });
    if (res.status === 402) return { data: { kind: 'paywall' } satisfies MatrixPayload, error: null };
    if (!res.ok) return { data: null, error: { message: `HTTP ${res.status}` } };
    const body = (await res.json()) as { ok: boolean; matrix?: AssignmentProgressMatrixData };
    if (!body.ok || !body.matrix) return { data: null, error: { message: 'bad payload' } };
    return { data: { kind: 'matrix', matrix: body.matrix } satisfies MatrixPayload, error: null };
  }, [classroomId]);

  const { data, loading, failed, retry } = useReportData<MatrixPayload>(load);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data) return null;
  if (data.kind === 'paywall') return <MatrixPaywall trialEnded />;
  return <MatrixTable classroomId={classroomId} matrix={data.matrix} />;
}

function MatrixTable({ classroomId, matrix }: { classroomId: string; matrix: AssignmentProgressMatrixData }) {
  const { t } = useLanguage();

  useEffect(() => {
    trackProgressReportViewed(classroomId, 'progress_report');
  }, [classroomId]);

  if (matrix.assignments.length === 0 || matrix.rows.length === 0) {
    return (
      <section data-testid="assignment-progress-matrix">
        <SectionTitle>{t('teacher.reports.progressMatrix.title')}</SectionTitle>
        <ReportEmpty />
        <p className="mt-2 text-center text-sm text-neo-cream/70">{t('teacher.reports.progressMatrix.empty')}</p>
      </section>
    );
  }

  return (
    <section data-testid="assignment-progress-matrix" className="space-y-4">
      <SectionTitle>{t('teacher.reports.progressMatrix.title')}</SectionTitle>
      <div className="overflow-x-auto rounded-neo border-2 border-neo-cream/40 bg-neo-navy">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neo-navy text-neo-cream/80">
              <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.student')}</th>
              {matrix.assignments.map((a) => (
                <th
                  key={a.id}
                  scope="col"
                  title={a.title}
                  dir="auto"
                  className="max-w-28 truncate p-3 text-start font-bold"
                >
                  {a.title}
                </th>
              ))}
              <th scope="col" className="p-3 text-end font-bold">{t('teacher.reports.progressMatrix.trend')}</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.studentId} data-testid="progress-matrix-row" className="border-t border-neo-cream/20">
                <th scope="row" dir="auto" className="px-3 py-2 text-start font-bold text-neo-white">
                  {row.studentName}
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={matrix.assignments[i].id}
                    data-testid="progress-matrix-cell"
                    data-student={row.studentId}
                    data-assignment={matrix.assignments[i].id}
                    data-completed={cell.completed}
                    className="px-3 py-2 text-neo-white tabular-nums"
                  >
                    {cell.completed ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        aria-label={t('teacher.reports.progressMatrix.cellCompleted', { score: cell.correctness ?? 0 })}
                      >
                        <Check className="size-4 text-neo-lime" aria-hidden="true" />
                        {cell.correctness}%
                      </span>
                    ) : (
                      <span aria-label={t('teacher.reports.progressMatrix.cellMissing')}>—</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-end text-neo-white">
                  <TrendBadge trend={row.trend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrendBadge({ trend }: { trend: AssignmentProgressMatrixData['rows'][number]['trend'] }) {
  const { t } = useLanguage();
  const label =
    trend === 'up'
      ? t('teacher.reports.progressMatrix.trendUp')
      : trend === 'down'
        ? t('teacher.reports.progressMatrix.trendDown')
        : trend === 'flat'
          ? t('teacher.reports.progressMatrix.trendFlat')
          : t('teacher.reports.progressMatrix.trendNone');
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold" aria-label={label} title={label}>
      {trend === 'up' ? (
        <TrendingUp className="size-4 text-neo-lime" aria-hidden="true" />
      ) : trend === 'down' ? (
        <TrendingDown className="size-4 text-neo-pink" aria-hidden="true" />
      ) : (
        <Minus className={trend === 'flat' ? 'size-4 text-neo-cream' : 'size-4 text-neo-white/40'} aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * The lock. Sample rows are static fakes — never the teacher's real students.
 * The primary CTA starts the live Polar checkout via useTeacherProCheckout;
 * inside the app webview (checkout blocked) the button is replaced by the
 * same not-in-app note ProGate shows.
 */
function MatrixPaywall({ trialEnded }: { trialEnded: boolean }) {
  const { t } = useLanguage();
  const checkout = useTeacherProCheckout('progress_report');
  const blockedInApp = useCheckoutBlockedInApp();

  useEffect(() => {
    trackProgressReportGateShown();
  }, []);

  const names = splitSampleList(t('eg2Pro.sample.students'), SAMPLE_STUDENTS.length, t('eg2Pro.sample.student'));
  const sampleStudents = SAMPLE_STUDENTS.slice(0, 3);

  return (
    <section data-testid="progress-matrix-paywall" className="space-y-4">
      <SectionTitle>{t('teacher.reports.progressMatrix.title')}</SectionTitle>
      <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-4 shadow-hard sm:p-5">
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
          <div data-testid="progress-matrix-sample" aria-hidden="true" className="pointer-events-none select-none">
            <div className="rounded-neo border-2 border-neo-cream/50 bg-neo-navy p-3 text-start shadow-hard-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate font-neo-display text-sm font-black text-neo-white">
                  {t('teacher.reports.progressMatrix.sampleTitle')}
                </p>
                <span
                  data-testid="progress-matrix-sample-badge"
                  className="shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neo-black"
                >
                  {t('eg2Pro.sample.badge')}
                </span>
              </div>
              <div className="space-y-1.5">
                {sampleStudents.map((s, i) => (
                  <div key={names[i]} className="flex items-center gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2 py-1">
                    <span className="w-14 shrink-0 truncate text-xs font-bold text-neo-white">{names[i]}</span>
                    {[0, 1, 2].map((c) => (
                      <span
                        key={c}
                        className={
                          (i + c) % 3 === 2
                            ? 'flex-1 rounded-sm border border-neo-cream/30 px-1 py-0.5 text-center text-[10px] font-bold text-neo-cream/50'
                            : 'flex-1 rounded-sm border border-neo-black bg-neo-lime/80 px-1 py-0.5 text-center text-[10px] font-black tabular-nums text-neo-black'
                        }
                      >
                        {(i + c) % 3 === 2 ? '—' : `${s.accuracy + c * 2}%`}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center md:text-start">
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 text-xs font-black uppercase text-neo-black">
              <Crown className="size-3" aria-hidden="true" />
              {t('teacher.subscription.proPlanName')}
            </span>
            <h3 className="mb-2 font-neo-display text-xl font-black text-neo-white">
              {t('teacher.reports.progressMatrix.gateTitle')}
            </h3>
            <p className="mb-4 text-sm font-bold leading-relaxed text-neo-white/80">
              {t('teacher.reports.progressMatrix.gateBody')}
            </p>
            {blockedInApp ? (
              <p data-testid="progress-matrix-not-in-app" className="text-sm font-bold text-neo-white/80">
                {t('teacher.subscription.notInApp')}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="progress-matrix-upgrade"
                  disabled={checkout.pending}
                  aria-busy={checkout.pending || undefined}
                  onClick={() => {
                    trackProgressReportUpgradeClicked();
                    rememberCheckoutOrigin(window.sessionStorage, `${window.location.pathname}${window.location.search}`);
                    void checkout.start();
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg disabled:opacity-60"
                >
                  <Lock className="size-4" aria-hidden="true" />
                  {t('teacher.reports.progressMatrix.gateCta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
                </button>
                <p className="mt-2 text-xs font-bold text-neo-white/60">{t('teacher.subscription.trustCancel')}</p>
              </>
            )}
            <p data-testid="progress-matrix-honest-line" className="mt-2 text-xs font-bold text-neo-cream/80">
              {trialEnded ? t('teacher.proGate.trialEnded') : t('teacher.proGate.freeKeeps', { modes: PRO_COPY_PARAMS.modes })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AssignmentProgressMatrix;
