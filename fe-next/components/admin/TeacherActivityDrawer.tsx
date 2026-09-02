'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Mail,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { TeacherFunnelRow } from '@/lib/education/teacherFunnel';
import type { TeacherActivityDetails } from '@/lib/education/teacherActivity';

interface Props {
  row: TeacherFunnelRow;
  onClose: () => void;
}

type Translate = (
  k: string,
  fb?: string | Record<string, string | number>,
  params?: Record<string, string | number>,
) => string;

function daysAgo(iso: string | null, t: Translate) {
  if (!iso) return t('admin.teacherFunnel.lastSeen.never', 'Never');
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return t('admin.teacherFunnel.lastSeen.never', 'Never');
  if (days <= 0) return t('admin.teacherFunnel.lastSeen.today', 'Today');
  return t('admin.teacherFunnel.lastSeen.daysAgo', '{days}d ago', { days: String(days) });
}

function trialLabel(expiresAt: string | null, t: Translate) {
  if (!expiresAt) return t('admin.teacherFunnel.trial.none', 'No trial');
  return Date.parse(expiresAt) > Date.now()
    ? t('admin.teacherFunnel.trial.active', 'Trial active')
    : t('admin.teacherFunnel.trial.expired', 'Trial expired');
}

export function TeacherActivityDrawer({ row, onClose }: Props) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TeacherActivityDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    dialog?.addEventListener('keydown', handleKeyDown);
    return () => dialog?.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!row.userId) {
      setError(t('admin.teacherActivity.error', 'Could not load teacher activity.'));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWithAuth(`/api/admin/teacher-funnel/${row.userId}/details`)
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
  }, [row.userId, t]);

  const teacher = data?.teacher;
  const name = teacher?.fullName || teacher?.displayName || row.fullName || row.email;
  const email = teacher?.email || row.email;
  const roleGranted = teacher?.roleGranted ?? row.roleGranted;
  const lastSeenAt = teacher?.lastSeenAt ?? row.lastSeenAt;
  const trialExpiresAt = teacher?.trialExpiresAt ?? row.trialExpiresAt;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
      role="dialog"
      aria-labelledby="teacher-activity-title"
    >
      <div className="w-full max-w-xl overflow-y-auto rounded-neo border-neo border-black bg-neo-white p-6 text-neo-navy shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm text-slate-500 underline"
        >
          <X className="h-4 w-4" aria-hidden />
          {t('admin.teacherAccess.close', 'Close')}
        </button>

        <h2 id="teacher-activity-title" className="mt-2 text-2xl font-bold text-neo-navy">
          {t('admin.teacherActivity.title', 'Teacher activity')}
        </h2>

        <section
          className="mt-4 rounded-neo border-neo border-black bg-neo-cream p-4 shadow-hard-sm"
          aria-label={t('admin.teacherActivity.health', 'Teacher health')}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-neo-display text-lg font-black text-neo-navy">{name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neo-navy/70">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {email}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-neo border border-black px-2 py-0.5 text-[11px] font-black uppercase ${
                roleGranted ? 'bg-neo-lime text-black' : 'bg-neo-red text-neo-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {roleGranted
                ? t('admin.teacherActivity.roleGranted', 'Role granted')
                : t('admin.teacherActivity.roleMissing', 'Role missing')}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase text-neo-navy/50">
                {t('admin.teacherFunnel.col.trial', 'Trial')}
              </dt>
              <dd className="font-bold">{trialLabel(trialExpiresAt, t)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase text-neo-navy/50">
                {t('admin.teacherFunnel.col.lastSeen', 'Last seen')}
              </dt>
              <dd className="flex items-center gap-1 font-bold">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {daysAgo(lastSeenAt, t)}
              </dd>
            </div>
          </dl>
        </section>

        {loading && (
          <p className="mt-4 text-sm text-neo-navy/60">{t('common.loading', 'Loading…')}</p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-neo-red">
            {error}
          </p>
        )}

        {data && !loading && (
          <div className="mt-4 space-y-4">
            <Section
              icon={<Users className="h-4 w-4" aria-hidden />}
              title={t('admin.teacherActivity.classrooms', 'Classrooms')}
              empty={data.classrooms.length === 0}
              emptyText={t('admin.teacherActivity.classroomsEmpty', 'No classrooms yet.')}
            >
              <ul className="divide-y divide-black/10">
                {data.classrooms.map((c) => (
                  <li key={c.id} className="py-2">
                    <p className="font-bold">{c.name || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}</p>
                    <p className="text-xs text-neo-navy/60">
                      {[c.language, c.joinCode, `${c.studentCount} ${t('admin.teacherFunnel.classrooms.students', 'Students').toLowerCase()}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<BookOpen className="h-4 w-4" aria-hidden />}
              title={t('admin.teacherActivity.wordlists', 'Wordlists')}
              empty={data.wordlists.length === 0}
              emptyText={t('admin.teacherActivity.wordlistsEmpty', 'No word lists yet.')}
            >
              <ul className="divide-y divide-black/10">
                {data.wordlists.map((w) => (
                  <li key={w.id} className="py-2">
                    <p className="font-bold">{w.name || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}</p>
                    <p className="text-xs text-neo-navy/60">
                      {[w.language, `${w.wordCount} ${t('admin.teacherActivity.words', 'words')}`, w.sourceGameCode]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<ClipboardList className="h-4 w-4" aria-hidden />}
              title={t('admin.teacherActivity.assignments', 'Assignments')}
              empty={data.assignments.length === 0}
              emptyText={t('admin.teacherActivity.assignmentsEmpty', 'No assignments yet.')}
            >
              <ul className="divide-y divide-black/10">
                {data.assignments.map((a) => (
                  <li key={a.id} className="py-2">
                    <p className="font-bold">{a.title || t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}</p>
                    <p className="text-xs text-neo-navy/60">
                      {[
                        a.type,
                        a.classroomName,
                        a.lessonName,
                        t('admin.teacherActivity.completedCount', '{count} completed', {
                          count: a.completedCount,
                        }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
              title={t('admin.teacherActivity.completions', 'Recent completions')}
              empty={data.completions.length === 0}
              emptyText={t('admin.teacherActivity.completionsEmpty', 'No recent completions.')}
            >
              <ul className="divide-y divide-black/10">
                {data.completions.map((c) => (
                  <li key={`${c.studentId}-${c.lessonId}-${c.completedAt}`} className="py-2">
                    <p className="font-bold">{c.lessonName || c.lessonId}</p>
                    <p className="text-xs text-neo-navy/60">
                      {[
                        c.studentId.slice(0, 8),
                        c.completedAt.slice(0, 10),
                        c.currentLevel != null
                          ? t('admin.teacherActivity.level', 'Lv {level}', { level: c.currentLevel })
                          : null,
                        c.totalXp != null ? `${c.totalXp} XP` : null,
                        t('admin.teacherActivity.wordsMastered', '{count} words mastered', {
                          count: c.wordsMasteredCount,
                        }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  empty,
  emptyText,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-neo border-neo border-black p-3">
      <h3 className="flex items-center gap-2 font-neo-display text-base font-black text-neo-navy">
        {icon}
        {title}
      </h3>
      {empty ? <p className="mt-2 text-sm text-neo-navy/50">{emptyText}</p> : <div className="mt-1">{children}</div>}
    </section>
  );
}
