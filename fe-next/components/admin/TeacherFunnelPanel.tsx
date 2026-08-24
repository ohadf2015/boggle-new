'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { AlertTriangle } from 'lucide-react';
import { TeacherAccessDrawer } from './TeacherAccessDrawer';
import type { TeacherAccessRequest } from '@/lib/education/types';
import type {
  ClassroomRow,
  TeacherFunnelResult,
  TeacherFunnelRow,
  TeacherStage,
  UseCaseReason,
} from '@/lib/education/teacherFunnel';

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

/**
 * The funnel row already carries everything the drawer renders, so the drilldown opens
 * from the panel with no second fetch. Kept as an explicit mapping rather than widening
 * the drawer's prop type — the drawer is the queue's component, and it stays that way.
 */
function toAccessRequest(r: TeacherFunnelRow): TeacherAccessRequest {
  return {
    id: r.requestId,
    user_id: r.userId,
    email: r.email,
    full_name: r.fullName ?? r.email,
    school_or_org: r.schoolOrOrg,
    country: r.country,
    role: (r.role ?? 'other') as TeacherAccessRequest['role'],
    locale: (r.locale ?? 'en') as TeacherAccessRequest['locale'],
    use_case: r.useCase ?? '',
    status: r.status as TeacherAccessRequest['status'],
    admin_note: r.adminNote,
    reviewed_at: r.reviewedAt,
    reviewed_by: null,
    trial_expires_at: r.trialExpiresAt,
    created_at: r.createdAt,
  };
}

/** Mirrors ACTIVITY_TABLES in app/api/admin/teacher-funnel/route.ts. */
const ACTIVITY_KEYS = [
  'classrooms',
  'lessons',
  'studentsJoined',
  'assignments',
  'lessonProgress',
  'achievements',
  'duels',
] as const;

const ACTIVITY_FALLBACK: Record<(typeof ACTIVITY_KEYS)[number], string> = {
  classrooms: 'Classrooms',
  lessons: 'Word lists',
  studentsJoined: 'Students joined',
  assignments: 'Assignments',
  lessonProgress: 'Students practising',
  achievements: 'Badges unlocked',
  duels: 'Duels played',
};

function Stat({
  label,
  value,
  alert,
  drop,
}: {
  label: string;
  value: number;
  alert?: boolean;
  /** People lost since the previous step. Undefined on the first step, which has no previous. */
  drop?: number;
}) {
  return (
    <div
      className={`rounded-neo border-neo px-3 py-2 shadow-hard-sm ${
        alert ? 'border-black bg-neo-red text-neo-white' : 'border-black bg-neo-cream text-black'
      }`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-neo-display text-2xl font-black leading-none">{value}</span>
        {/* Six equal tiles hide WHERE people are lost. The drop is the whole point of a funnel. */}
        {drop !== undefined && drop > 0 && (
          <span className="font-neo-body text-xs font-bold text-neo-red">−{drop}</span>
        )}
      </div>
      <div className="mt-1 font-neo-body text-[11px] font-bold uppercase opacity-70">{label}</div>
    </div>
  );
}

/** Consistent section chrome, so the panel reads as sections rather than a stack of blocks. */
function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-neo border-neo border-black bg-neo-navy-light p-3">
      <h3 className="font-neo-display text-base font-black text-neo-white">{title}</h3>
      {hint && <p className="mt-1 font-neo-body text-xs text-neo-white/50">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Every distinct answer to "what will you use this for?", verbatim, most-given first.
 *
 * No themes and no keyword buckets on purpose. A third of the corpus is the access
 * form's own example chips tapped unchanged (see lib/education/useCaseChips.ts), so
 * clustering would rank LexiClash's marketing copy as the top teacher demand. The
 * chip/own-words split is the first thing this panel has to show, not a footnote.
 */
function ReasonsPanel({
  reasons,
  t,
}: {
  reasons: UseCaseReason[];
  // Same shape as LanguageContext's t: second arg is a fallback string or interpolation
  // params. Typed rather than `any` so a `t` that drops the fallback fails to compile —
  // every string in this panel is fallback-only, so silently ignoring it would render
  // raw `admin.teacherFunnel.*` keys on screen.
  t: (k: string, f?: string | Record<string, string | number>) => string;
}) {
  const own = reasons.filter((r) => r.kind === 'free');
  const chips = reasons.filter((r) => r.kind === 'chip');
  const ownCount = own.reduce((n, r) => n + r.count, 0);
  const chipCount = chips.reduce((n, r) => n + r.count, 0);

  const Row = ({ r }: { r: UseCaseReason }) => (
    <li className="flex items-start gap-2 border-b border-black/20 py-1.5 last:border-0">
      <span className="mt-0.5 min-w-[1.75rem] rounded-neo border border-black bg-neo-cream px-1 text-center text-[11px] font-black tabular-nums text-black">
        {r.count}
      </span>
      <span className="flex-1 text-neo-white/90">
        {r.text}
        {(r.roles.length > 0 || r.countries.length > 0) && (
          <span className="ms-2 text-[11px] text-neo-white/40">
            {[...r.roles, ...r.countries].join(' · ')}
          </span>
        )}
      </span>
    </li>
  );

  return (
    <section className="mt-4 rounded-neo border-neo border-black bg-neo-navy-light p-3">
      <h3 className="font-neo-display text-base font-black text-neo-white">
        {t('admin.teacherFunnel.reasons.title', 'Why they say they want it')}
      </h3>
      <p className="mt-1 font-neo-body text-xs text-neo-white/50">
        {t(
          'admin.teacherFunnel.reasons.subtitle',
          'Verbatim, not grouped into themes — the sample is too small to cluster honestly.',
        )}
      </p>

      {reasons.length === 0 ? (
        <p className="mt-3 font-neo-body text-sm text-neo-white/50">
          {t('admin.teacherFunnel.reasons.empty', 'Nobody has stated a reason yet.')}
        </p>
      ) : (
        <div className="mt-3 grid gap-4 font-neo-body text-sm lg:grid-cols-2">
          <div>
            <h4 className="text-[11px] font-bold uppercase text-neo-lime">
              {t('admin.teacherFunnel.reasons.own', 'Their own words')} ({ownCount})
            </h4>
            <ul className="mt-1">
              {own.map((r) => <Row key={r.text} r={r} />)}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase text-neo-orange">
              {t('admin.teacherFunnel.reasons.chips', 'Our example chips, tapped unchanged')} ({chipCount})
            </h4>
            <ul className="mt-1 opacity-70">
              {chips.map((r) => <Row key={r.text} r={r} />)}
            </ul>
            {chipCount > 0 && (
              <p className="mt-2 text-[11px] text-neo-white/40">
                {t(
                  'admin.teacherFunnel.reasons.chipsHint',
                  'These are the form’s own suggestions. Treat them as engagement with the form, not as demand.',
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * The classrooms themselves, named, with whoever opened each one. The counters above answer
 * "how many" — this answers "which", which is the question you actually have when only two
 * classrooms exist. Listed classroom-first rather than teacher-first so an owner who never
 * filled in the access form still shows up; the funnel table below cannot show those at all.
 */
function ClassroomsPanel({
  classrooms,
  t,
}: {
  classrooms: ClassroomRow[];
  t: (k: string, v?: Record<string, string> | string) => string;
}) {
  return (
    <Block
      title={`${t('admin.teacherFunnel.classrooms.title', 'Classrooms that exist')} (${classrooms.length})`}
      hint={t(
        'admin.teacherFunnel.classrooms.subtitle',
        'Every classroom in the database, newest first — its name and who opened it.',
      )}
    >
      {classrooms.length === 0 ? (
        <p className="mt-3 font-neo-body text-sm text-neo-white/50">
          {t('admin.teacherFunnel.classrooms.empty', 'No classroom has ever been opened.')}
        </p>
      ) : (
        // Wide table on a narrow phone: scroll the table, never the page.
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-neo-body text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase text-neo-white/50">
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.name', 'Classroom')}</th>
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.teacher', 'Opened by')}</th>
                <th className="py-1 pe-3 text-right">
                  {t('admin.teacherFunnel.classrooms.students', 'Students')}
                </th>
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.created', 'Created')}</th>
              </tr>
            </thead>
            <tbody className="text-neo-white">
              {classrooms.map((c) => (
                <tr key={c.id} className="border-t border-neo-white/10 align-top">
                  <td className="py-2 pe-3">
                    <span className="font-bold">
                      {c.name ?? (
                        <span className="italic text-neo-white/40">
                          {t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}
                        </span>
                      )}
                    </span>
                    <span className="ms-2 text-[11px] text-neo-white/40">
                      {[c.language, c.joinCode].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="py-2 pe-3">
                    {/* Never blank: name → email → raw id, in that order of usefulness. */}
                    <span>{c.teacherName ?? c.teacherEmail ?? c.teacherId ?? '—'}</span>
                    {c.teacherName && c.teacherEmail && (
                      <span className="ms-2 text-[11px] text-neo-white/40">{c.teacherEmail}</span>
                    )}
                    {!c.teacherIsApplicant && (
                      <span
                        className="ms-2 rounded-neo bg-neo-navy px-1.5 py-0.5 text-[10px] font-bold uppercase text-neo-white/60"
                        title={t(
                          'admin.teacherFunnel.classrooms.notApplicantHint',
                          'This owner never filled in the teacher access form, so they do not appear in the funnel table below.',
                        )}
                      >
                        {t('admin.teacherFunnel.classrooms.notApplicant', 'no access request')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pe-3 text-right tabular-nums">
                    <span className={c.students === 0 ? 'text-neo-orange' : 'text-neo-lime'}>
                      {c.students}
                    </span>
                  </td>
                  <td className="py-2 pe-3 whitespace-nowrap text-neo-white/70">
                    {c.createdAt ? c.createdAt.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Block>
  );
}

export function TeacherFunnelPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState<TeacherFunnelRow | null>(null);
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

  // `reasons` and `activity` arrived after the first version of this panel shipped. During a
  // deploy window a cached client bundle can meet the old API (or vice versa), and
  // `reasons.filter` on undefined white-screens the whole admin page — default them.
  const { summary, rows } = data;
  const reasons = data.reasons ?? [];
  const activity = data.activity ?? {};
  const classrooms = data.classrooms ?? [];

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

      {/* Ordered left-to-right as the actual funnel, each tile showing what it lost from the
          step before it. The interesting number here has never been a total — it is the step
          where everyone disappears. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('admin.teacherFunnel.stat.requested')} value={summary.requested} />
        <Stat
          label={t('admin.teacherFunnel.stat.approved')}
          value={summary.approved}
          drop={summary.requested - summary.approved}
        />
        <Stat
          label={t('admin.teacherFunnel.stat.roleGranted')}
          value={summary.roleGranted}
          alert={summary.blocked > 0}
          drop={summary.approved - summary.roleGranted}
        />
        <Stat
          label={t('admin.teacherFunnel.stat.createdClassroom')}
          value={summary.createdClassroom}
          drop={summary.roleGranted - summary.createdClassroom}
        />
        <Stat
          label={t('admin.teacherFunnel.stat.gotStudents')}
          value={summary.gotStudents}
          drop={summary.createdClassroom - summary.gotStudents}
        />
        <Stat
          label={t('admin.teacherFunnel.stat.assigned')}
          value={summary.assigned}
          drop={summary.gotStudents - summary.assigned}
        />
      </div>

      {/* The leak `blocked` cannot see. They can get in, they did come back, and they
          still have not made a classroom — so the drop is discovery inside the app,
          not the grant. The trial number is the clock on doing something about it. */}
      {summary.returnedNoClassroom > 0 && (
        <div className="mt-3 rounded-neo border-neo border-black bg-neo-orange p-3 text-black shadow-hard">
          <p className="font-neo-body text-sm font-bold">
            {t(
              'admin.teacherFunnel.returnedNoClassroom',
              `${summary.returnedNoClassroom} approved teachers came back to the app and still have no classroom (${summary.returnedNoClassroomTrialActive} with a trial still running).`,
            )}
          </p>
        </div>
      )}

      {summary.excludedMachineRows > 0 && (
        <p className="mt-2 font-neo-body text-xs text-neo-white/40">
          {t(
            'admin.teacherFunnel.excludedMachineRows',
            `${summary.excludedMachineRows} machine-written rows (integration tests) excluded from every number above.`,
          )}
        </p>
      )}

      {/* WHICH classrooms, before any whole-product totals: when only two exist, "2" is
          useless and their names tell you everything. */}
      <ClassroomsPanel classrooms={classrooms} t={t} />

      <ReasonsPanel reasons={reasons} t={t} />

      {/* Demoted below the named data on purpose. These are all-time whole-product counts —
          context, not the answer to "who is teaching". Kept because an empty module and a
          missing panel look identical until you print the zeros. */}
      <Block
        title={t('admin.teacherFunnel.activity.title', 'What is happening inside the module')}
        hint={t(
          'admin.teacherFunnel.activity.hint',
          'Whole-product totals, all time. A dash means the count failed, which is not the same as zero.',
        )}
      >
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ACTIVITY_KEYS.map((k) => (
            <div key={k} className="rounded-neo border border-black bg-neo-cream px-2 py-1.5 text-black">
              <div className="font-neo-display text-xl font-black leading-none tabular-nums">
                {activity[k] === null || activity[k] === undefined ? '—' : activity[k]}
              </div>
              <div className="mt-1 font-neo-body text-[10px] font-bold uppercase opacity-70">
                {t(`admin.teacherFunnel.activity.${k}`, ACTIVITY_FALLBACK[k])}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* Wide table on a narrow phone: scroll the table, never the page. */}
      <div className="mt-4 overflow-x-auto rounded-neo border-neo border-black bg-neo-navy-light">
        <table className="w-full min-w-[720px] text-start font-neo-body text-sm">
          <thead>
            <tr className="border-b border-black/40 text-[11px] uppercase text-neo-white/50">
              <th className="p-2 text-start font-bold">{t('admin.teacherFunnel.col.teacher')}</th>
              <th className="p-2 text-start font-bold">
                {t('admin.teacherFunnel.col.reason', 'Reason')}
              </th>
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
                <td colSpan={9} className="p-4 text-center text-neo-white/50">
                  {t('admin.teacherFunnel.empty')}
                </td>
              </tr>
            )}
            {rows.map((r: TeacherFunnelRow) => (
              <tr
                key={r.requestId}
                onClick={() => setOpen(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen(r);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={t('admin.teacherFunnel.rowOpen', 'Open request details')}
                className="cursor-pointer border-b border-black/20 text-neo-white/90 hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime focus-visible:ring-inset"
              >
                <td className="p-2">
                  <div className="font-bold">{r.fullName || r.email}</div>
                  <div className="text-xs text-neo-white/50">{r.email}</div>
                </td>
                <td className="max-w-[22rem] p-2 align-top">
                  {r.useCaseKind === 'empty' ? (
                    <span className="text-neo-white/30">—</span>
                  ) : (
                    <>
                      <span className="text-neo-white/80">{r.useCase}</span>
                      {r.useCaseKind === 'chip' && (
                        <span
                          className="ms-2 inline-block rounded border border-black bg-neo-orange px-1 text-[10px] font-black uppercase text-black"
                          title={t(
                            'admin.teacherFunnel.chipTitle',
                            'Verbatim example text offered by the form — not the applicant’s own words',
                          )}
                        >
                          {t('admin.teacherFunnel.chipBadge', 'example')}
                        </span>
                      )}
                    </>
                  )}
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

      {open && (
        <TeacherAccessDrawer
          row={toAccessRequest(open)}
          onClose={() => setOpen(null)}
          onActioned={() => { load(); }}
        />
      )}
    </section>
  );
}
