'use client';

/**
 * AdminTeacherDetail — the admin's read-only view of one teacher's world.
 *
 * What the teacher sees spread across their dashboard, analytics and reports,
 * flattened into one scroll: identity + plan, classrooms with rosters and the
 * games actually played in each, wordlists with their words, assignments and
 * completions. All data comes from /api/admin/teacher-funnel/[userId]/details
 * (service-role, admin-gated) — nothing here mutates.
 *
 * Admin console text uses the t(key, 'English') fallback pattern like the
 * rest of the admin panels; it is not teacher-facing and stays English-first.
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gamepad2,
  Gift,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type {
  ClassroomGameSummary,
  TeacherActivityDetails,
} from '@/lib/education/teacherActivity';

type Translate = (
  k: string,
  fb?: string | Record<string, string | number>,
  params?: Record<string, string | number>,
) => string;

function daysAgo(iso: string | null, t: Translate): string {
  if (!iso) return t('admin.teacherFunnel.lastSeen.never', 'Never');
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return t('admin.teacherFunnel.lastSeen.never', 'Never');
  if (days <= 0) return t('admin.teacherFunnel.lastSeen.today', 'Today');
  return t('admin.teacherFunnel.lastSeen.daysAgo', '{days}d ago', { days: String(days) });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { hour12: false });
}

export function AdminTeacherDetail({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<TeacherActivityDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWithAuth(`/api/admin/teacher-funnel/${userId}/details`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<TeacherActivityDetails>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('admin.teacherActivity.error', 'Could not load teacher activity.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  if (loading) {
    return <p className="p-6 text-neo-white/70">{t('common.loading', 'Loading…')}</p>;
  }
  if (error || !data) {
    return <p role="alert" className="p-6 text-neo-pink">{error}</p>;
  }

  const teacher = data.teacher;
  const name =
    teacher.fullName || teacher.displayName || teacher.username || teacher.email || userId;
  const totalGames = Object.values(data.gamesByClassroom).reduce(
    (sum, games) => sum + games.length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Identity + plan */}
      <header className="rounded-neo border-neo border-black bg-neo-cream p-5 text-neo-navy shadow-hard">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-neo-display text-2xl font-black">{name}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neo-navy/70">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {teacher.email || '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              ok={teacher.roleGranted}
              okLabel={t('admin.teacherActivity.roleGranted', 'Role granted')}
              badLabel={t('admin.teacherActivity.roleMissing', 'Role missing')}
              icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
            />
            <Chip
              ok={data.plan.hasPro}
              okLabel={t('admin.teacherDetail.planPro', 'PRO')}
              badLabel={`${t('admin.teacherDetail.planFree', 'Free')} · ${data.plan.tier}`}
              icon={
                data.plan.hasPro ? (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                )
              }
            />
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Meta label={t('admin.teacherFunnel.col.trial', 'Trial')} value={trialLabel(teacher.trialExpiresAt, t)} />
          <Meta label={t('admin.teacherFunnel.col.lastSeen', 'Last seen')} value={daysAgo(teacher.lastSeenAt, t)} />
          <Meta
            label={t('admin.teacherDetail.renews', 'Renews')}
            value={data.plan.hasPro ? fmtDate(data.plan.periodEnd) : '—'}
          />
          <Meta label={t('admin.teacherActivity.status', 'Status')} value={teacher.status ?? '—'} />
        </dl>
      </header>

      {/* Classrooms + games played */}
      <Section
        icon={<Users className="h-4 w-4" aria-hidden />}
        title={t('admin.teacherActivity.classrooms', 'Classrooms')}
        count={data.classrooms.length}
      >
        {data.classrooms.length === 0 ? (
          <Empty text={t('admin.teacherActivity.classroomsEmpty', 'No classrooms yet.')} />
        ) : (
          <ul className="space-y-3">
            {data.classrooms.map((c) => {
              const games = data.gamesByClassroom[c.id] ?? [];
              return (
                <li key={c.id} className="rounded-neo border-2 border-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black">
                      {c.name || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}
                    </p>
                    <p className="text-xs font-bold text-neo-navy/60">
                      {[c.language, c.joinCode && `code ${c.joinCode}`, fmtDate(c.createdAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-neo-navy/60">
                    {t('admin.teacherFunnel.classrooms.students', 'Students')}: {c.studentCount}
                    {c.students.length > 0 && (
                      <span className="ms-1">
                        ({c.students.slice(0, 8).map((s) => s.id.slice(0, 6)).join(', ')}
                        {c.students.length > 8 ? '…' : ''})
                      </span>
                    )}
                  </p>
                  <GamesTable games={games} t={t} />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Wordlists */}
      <Section
        icon={<BookOpen className="h-4 w-4" aria-hidden />}
        title={t('admin.teacherActivity.wordlists', 'Wordlists')}
        count={data.wordlists.length}
      >
        {data.wordlists.length === 0 ? (
          <Empty text={t('admin.teacherActivity.wordlistsEmpty', 'No word lists yet.')} />
        ) : (
          <ul className="divide-y divide-black/10">
            {data.wordlists.map((w) => (
              <li key={w.id} className="py-2">
                <p className="font-bold">
                  {w.name || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}
                  <span className="ms-2 text-xs font-bold text-neo-navy/60">
                    {[w.language, `${w.wordCount} ${t('admin.teacherActivity.words', 'words')}`, w.sourceGameCode]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </p>
                {w.words.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {w.words.map((word) => (
                      <span
                        key={word}
                        className="rounded border border-black/30 bg-neo-navy/5 px-1.5 py-0.5 text-[11px] font-bold"
                      >
                        {word}
                      </span>
                    ))}
                    {w.wordCount > w.words.length && (
                      <span className="text-[11px] font-bold text-neo-navy/50">
                        +{w.wordCount - w.words.length}
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Assignments */}
      <Section
        icon={<ClipboardList className="h-4 w-4" aria-hidden />}
        title={t('admin.teacherActivity.assignments', 'Assignments')}
        count={data.assignments.length}
      >
        {data.assignments.length === 0 ? (
          <Empty text={t('admin.teacherActivity.assignmentsEmpty', 'No assignments yet.')} />
        ) : (
          <ul className="divide-y divide-black/10">
            {data.assignments.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-bold">{a.title || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}</p>
                <p className="text-xs text-neo-navy/60">
                  {[a.type, a.classroomName, a.lessonName, a.dueDate && `due ${fmtDate(a.dueDate)}`,
                    t('admin.teacherActivity.completedCount', '{count} completed', { count: a.completedCount })]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent completions */}
      <Section
        icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        title={t('admin.teacherActivity.completions', 'Recent completions')}
        count={data.completions.length}
      >
        {data.completions.length === 0 ? (
          <Empty text={t('admin.teacherActivity.completionsEmpty', 'No recent completions.')} />
        ) : (
          <ul className="divide-y divide-black/10">
            {data.completions.map((c) => (
              <li key={`${c.studentId}-${c.lessonId}-${c.completedAt}`} className="py-2">
                <p className="font-bold">{c.lessonName || c.lessonId}</p>
                <p className="text-xs text-neo-navy/60">
                  {[c.studentId.slice(0, 8), fmtDate(c.completedAt),
                    c.currentLevel != null && t('admin.teacherActivity.level', 'Lv {level}', { level: c.currentLevel }),
                    c.totalXp != null && `${c.totalXp} XP`,
                    t('admin.teacherActivity.wordsMastered', '{count} words mastered', { count: c.wordsMasteredCount })]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-neo-white/40">
        {t('admin.teacherDetail.gameCount', '{count} live games across {classrooms} classrooms', {
          count: totalGames,
          classrooms: String(data.classrooms.length),
        })}
      </p>
    </div>
  );
}

function trialLabel(expiresAt: string | null, t: Translate): string {
  if (!expiresAt) return t('admin.teacherFunnel.trial.none', 'No trial');
  return Date.parse(expiresAt) > Date.now()
    ? t('admin.teacherFunnel.trial.active', 'Trial active')
    : t('admin.teacherFunnel.trial.expired', 'Trial expired');
}

function GamesTable({ games, t }: { games: ClassroomGameSummary[]; t: Translate }) {
  if (games.length === 0) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neo-navy/50">
        <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
        {t('admin.teacherDetail.noGames', 'No live games played yet.')}
      </p>
    );
  }
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-black/20 text-[10px] uppercase text-neo-navy/50">
            <th className="py-1 pe-3">{t('admin.teacherDetail.colPlayed', 'Played')}</th>
            <th className="py-1 pe-3">{t('admin.teacherDetail.colMode', 'Mode')}</th>
            <th className="py-1 pe-3">{t('admin.teacherDetail.colPlayers', 'Players')}</th>
            <th className="py-1 pe-3">{t('admin.teacherDetail.colCoverage', 'Coverage')}</th>
            <th className="py-1">{t('admin.teacherDetail.colTop', 'Top')}</th>
            <th className="py-1">{t('admin.teacherDetail.colMissed', 'Most missed')}</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.gameCode} className="border-b border-black/10 align-top">
              <td className="py-1.5 pe-3 whitespace-nowrap">{fmtDateTime(g.playedAt)}</td>
              <td className="py-1.5 pe-3 font-bold">{g.gameMode}</td>
              <td className="py-1.5 pe-3 whitespace-nowrap">
                {g.playerCount}
                {g.rosterCount != null && `/${g.rosterCount}`}
              </td>
              <td className="py-1.5 pe-3">{Math.round(g.coveragePct)}%</td>
              <td className="py-1.5 pe-3">
                {g.topPlayers.map((p) => `${p.name} ${p.score}`).join(', ') || '—'}
              </td>
              <td className="py-1.5">{g.missedWords.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chip({
  ok,
  okLabel,
  badLabel,
  icon,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
  icon: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-neo border border-black px-2 py-0.5 text-[11px] font-black uppercase ${
        ok ? 'bg-neo-lime text-black' : 'bg-neo-red text-neo-white'
      }`}
    >
      {icon}
      {ok ? okLabel : badLabel}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] font-bold uppercase text-neo-navy/50">
        <Clock className="h-3 w-3" aria-hidden />
        {label}
      </dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-neo border-neo border-black bg-neo-cream p-4 text-neo-navy shadow-hard-sm">
      <h2 className="flex items-center gap-2 font-neo-display text-lg font-black">
        {icon}
        {title}
        <span className="rounded border border-black bg-neo-navy px-1.5 text-xs text-neo-white">
          {count}
        </span>
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-neo-navy/50">{text}</p>;
}

export default AdminTeacherDetail;

// Single source for the drill-down path so the funnel drawer deep-links
// without hardcoding the route.
export function teacherDetailPath(language: string, userId: string): string {
  return `/${language}/admin/education/teacher/${userId}`;
}
