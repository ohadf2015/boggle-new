'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ClipboardList, Gamepad2, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { ClassDetail } from '@/lib/admin/eduClassDetail';
import { teacherDetailPath } from './AdminTeacherDetail';

function fmtDate(iso: string | null, language: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(language);
}

export function AdminClassDetail({ classId }: { classId: string }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState<ClassDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setData(null);
    fetchWithAuth(`/api/admin/edu-dashboard/class/${classId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as ClassDetail;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (failed) {
    return (
      <p role="alert" className="p-6 text-neo-red">
        {t('admin.eduClass.error', 'Could not load this class.')}
      </p>
    );
  }
  if (!data) return <p className="p-6 text-neo-cream/70">{t('common.loading', 'Loading…')}</p>;

  const { classroom, teacher, rounds } = data;
  const unnamed = t('admin.eduClass.unnamed', '(unnamed)');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="rounded-neo border-neo border-neo-black bg-neo-cream p-5 text-neo-navy shadow-hard">
        <h1 className="font-neo-display text-2xl font-black">{classroom.name || unnamed}</h1>
        <p className="mt-1 text-sm text-neo-navy/70">
          {t('admin.eduClass.teacher', 'Teacher')}:{' '}
          {teacher ? (
            <Link href={teacherDetailPath(language, teacher.id)} className="font-bold underline-offset-2 hover:underline">
              {teacher.name || teacher.id}
            </Link>
          ) : (
            '—'
          )}
          {teacher?.isTestAccount && (
            <span className="ms-2 rounded border border-neo-black bg-neo-yellow px-1.5 text-xs font-bold">
              {t('admin.eduClass.testTeacher', 'Test account')}
            </span>
          )}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Meta label={t('admin.eduClass.joinCode', 'Join code')} value={classroom.joinCode ?? '—'} />
          <Meta label={t('admin.eduClass.language', 'Language')} value={classroom.language ?? '—'} />
          <Meta label={t('admin.eduClass.created', 'Created')} value={fmtDate(classroom.createdAt, language)} />
          <Meta label={t('admin.eduClass.lastGame', 'Last class game')} value={fmtDate(rounds.lastPlayedAt, language)} />
        </dl>
      </header>

      <Section testId="class-students" icon={<Users className="h-4 w-4" aria-hidden />} title={t('admin.eduClass.students', 'Students')} count={data.studentCount}>
        {data.students.length === 0 ? (
          <Empty text={t('admin.eduClass.studentsEmpty', 'No student has joined yet.')} />
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="text-xs text-neo-navy/60">
              <tr>
                <th className="py-1 pe-3 text-start">{t('admin.eduClass.student', 'Student')}</th>
                <th className="py-1 pe-3 text-start">{t('admin.eduClass.joined', 'Joined')}</th>
                <th className="py-1 text-start">{t('admin.eduClass.lastSeen', 'Last seen')}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} className="border-t border-neo-navy/10">
                  <td className="py-1 pe-3 font-bold">{s.name ?? t('admin.eduClass.noName', 'No name ({id})', { id: s.id.slice(0, 6) })}</td>
                  <td className="py-1 pe-3">{fmtDate(s.joinedAt, language)}</td>
                  <td className="py-1">{fmtDate(s.lastSeenAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data.excludedTestStudents > 0 && (
          <p className="mt-2 text-xs text-neo-navy/60">
            {t('admin.eduClass.testStudents', 'Test accounts left out: {count}.', { count: data.excludedTestStudents })}
          </p>
        )}
      </Section>

      <Section
        testId="class-assignments"
        icon={<ClipboardList className="h-4 w-4" aria-hidden />}
        title={t('admin.eduClass.assignments', 'Assignments')}
        count={data.assignments.length}
      >
        {data.assignments.length === 0 ? (
          <Empty text={t('admin.eduClass.assignmentsEmpty', 'Nothing assigned yet.')} />
        ) : (
          <ul className="divide-y divide-neo-navy/10">
            {data.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="font-bold">{a.lessonName || unnamed}</span>
                <span className="text-xs text-neo-navy/70">
                  {t('admin.eduClass.completion', '{done} of {total} finished', { done: a.completed, total: a.assigned })}
                  {a.dueDate && ` · ${t('admin.eduClass.due', 'due {date}', { date: fmtDate(a.dueDate, language) })}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section testId="class-games" icon={<Gamepad2 className="h-4 w-4" aria-hidden />} title={t('admin.eduClass.games', 'Class games')} count={data.games.length}>
        <p className="text-sm">
          {rounds.available
            ? t('admin.eduClass.roundsSummary', '{count} class games in the last 30 days', { count: rounds.last30Days ?? 0 })
            : t('admin.eduDashboard.notMeasured', 'Not measured yet: the class games table is missing in this database.')}
          {rounds.modes.length > 0 && ` · ${rounds.modes.map((m) => `${m.mode} ${m.rounds}`).join(', ')}`}
        </p>
        {data.games.length === 0 ? (
          <Empty text={t('admin.eduClass.noGames', 'No live games played yet.')} />
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="text-neo-navy/60">
                <tr>
                  <th className="py-1 pe-3 text-start">{t('admin.eduClass.colPlayed', 'Played')}</th>
                  <th className="py-1 pe-3 text-start">{t('admin.eduClass.colMode', 'Mode')}</th>
                  <th className="py-1 pe-3 text-start">{t('admin.eduClass.colPlayers', 'Players')}</th>
                  <th className="py-1 pe-3 text-start">{t('admin.eduClass.colCoverage', 'Coverage')}</th>
                  <th className="py-1 pe-3 text-start">{t('admin.eduClass.colTop', 'Top')}</th>
                  <th className="py-1 text-start">{t('admin.eduClass.colMissed', 'Most missed')}</th>
                </tr>
              </thead>
              <tbody>
                {data.games.map((g) => (
                  <tr key={g.gameCode} className="border-t border-neo-navy/10 align-top">
                    <td className="py-1.5 pe-3 whitespace-nowrap">{fmtDate(g.playedAt, language)}</td>
                    <td className="py-1.5 pe-3 font-bold">{g.gameMode}</td>
                    <td className="py-1.5 pe-3">{g.rosterCount != null ? `${g.playerCount}/${g.rosterCount}` : g.playerCount}</td>
                    <td className="py-1.5 pe-3">{`${Math.round(g.coveragePct)}%`}</td>
                    <td className="py-1.5 pe-3">{g.topPlayers.map((p) => `${p.name} ${p.score}`).join(', ') || '—'}</td>
                    <td className="py-1.5">{g.missedWords.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-neo-navy/60">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function Section({ testId, icon, title, count, children }: { testId: string; icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <section data-testid={testId} className="rounded-neo border-neo border-neo-black bg-neo-cream p-4 text-neo-navy shadow-hard-sm">
      <h2 className="flex items-center gap-2 font-neo-display text-lg font-black">
        {icon}
        {title}
        <span className="rounded border border-neo-black bg-neo-navy px-1.5 text-xs text-neo-white">{count}</span>
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-neo-navy/60">{text}</p>;
}
