'use client';

import { useId, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';

const API = '/api/education/google-classroom';
const K = 'teacher.classrooms.gcImport';

const ACTION =
  'flex min-h-10 w-full items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream/40 px-3 py-1.5 font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-cream/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan disabled:opacity-60';

interface Course {
  id: string;
  name: string;
}

interface MatchResult {
  matchedCount: number;
  matched: Array<{ studentId: string; name: string | null; consentNeeded: boolean }>;
  unmatched: Array<{ displayName: string }>;
  linked: number;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'reauth' }
  | { kind: 'error' }
  | { kind: 'courses'; courses: Course[] }
  | { kind: 'result'; courses: Course[]; result: MatchResult; linked: number | null };

async function call(url: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

/** Teacher-side roster check against a Google Classroom course. Creates no accounts. */
export function GoogleClassroomRosterImport({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  const selectId = useId();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState(false);

  if (process.env.NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED !== 'true') return null;

  const fail = (status: number, body: Record<string, unknown>) =>
    setPhase(body.reauth === true || status === 401 ? { kind: 'reauth' } : { kind: 'error' });

  const loadCourses = async () => {
    setPhase({ kind: 'loading' });
    try {
      const { status, body } = await call(`${API}/courses`);
      if (status !== 200 || !Array.isArray(body.courses)) return fail(status, body);
      const courses = body.courses as Course[];
      setCourseId(courses[0]?.id ?? '');
      setPhase({ kind: 'courses', courses });
    } catch {
      setPhase({ kind: 'error' });
    }
  };

  const match = async (link: boolean, courses: Course[]) => {
    setBusy(true);
    try {
      const { status, body } = await call(`${API}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link ? { classroomId, courseId, link: true } : { classroomId, courseId }),
      });
      if (status !== 200 || body.ok !== true) return fail(status, body);
      if (link && phase.kind === 'result') setPhase({ ...phase, linked: Number(body.linked) || 0 });
      else setPhase({ kind: 'result', courses, result: body as unknown as MatchResult, linked: null });
    } catch {
      setPhase({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const returnTo = typeof window === 'undefined' ? '/' : window.location.pathname;
  const courses = phase.kind === 'courses' || phase.kind === 'result' ? phase.courses : [];

  return (
    <div className="mt-2 space-y-2 font-neo-body text-sm text-neo-cream" data-testid="gc-roster-import">
      {phase.kind === 'idle' && (
        <button type="button" className={ACTION} onClick={loadCourses}>
          {t(`${K}.action`)}
        </button>
      )}
      {phase.kind === 'loading' && <Loader size="sm" />}
      {phase.kind === 'reauth' && (
        <a className={ACTION} href={`${API}/oauth/start?returnTo=${encodeURIComponent(returnTo)}`}>
          {t(`${K}.connect`)}
        </a>
      )}
      {phase.kind === 'error' && (
        <p role="alert" className="font-bold">
          {t(`${K}.error`)}
        </p>
      )}
      {phase.kind === 'courses' && courses.length === 0 && <p>{t(`${K}.noCourses`)}</p>}
      {courses.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label htmlFor={selectId} className="basis-full font-bold">
            {t(`${K}.pickCourse`)}
          </label>
          <select
            id={selectId}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2 text-neo-cream"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className={`${ACTION} w-auto`} disabled={busy || !courseId} onClick={() => match(false, courses)}>
            {t(`${K}.check`)}
          </button>
        </div>
      )}
      {phase.kind === 'result' && <RosterResult result={phase.result} linked={phase.linked} busy={busy} onLink={() => match(true, courses)} />}
    </div>
  );
}

function RosterResult({ result, linked, busy, onLink }: { result: MatchResult; linked: number | null; busy: boolean; onLink: () => void }) {
  const { t } = useLanguage();
  const needConsent = result.matched.filter((m) => m.consentNeeded);
  const canLink = result.matched.some((m) => !m.consentNeeded);
  return (
    <div className="space-y-2">
      <p className="font-bold">{t(`${K}.matched`, { count: result.matchedCount })}</p>
      {result.unmatched.length > 0 && (
        <div>
          <p className="font-bold">{t(`${K}.unmatchedTitle`, { count: result.unmatched.length })}</p>
          <ul className="ps-4 list-disc text-neo-cream/80">
            {result.unmatched.map((u, i) => (
              <li key={`${u.displayName}-${i}`}>{u.displayName}</li>
            ))}
          </ul>
        </div>
      )}
      {needConsent.length > 0 && (
        <div>
          <p className="font-bold">{t(`${K}.consentTitle`, { count: needConsent.length })}</p>
          <p className="text-neo-cream/80">{t(`${K}.consentHint`)}</p>
          <ul className="ps-4 list-disc text-neo-cream/80">
            {needConsent.map((m) => (
              <li key={m.studentId}>{m.name || t('teacher.classrooms.students.unknown')}</li>
            ))}
          </ul>
        </div>
      )}
      {linked !== null ? (
        <p className="font-bold">{t(`${K}.linked`, { count: linked })}</p>
      ) : (
        canLink && (
          <button type="button" className={ACTION} disabled={busy} onClick={onLink}>
            {t(`${K}.link`)}
          </button>
        )
      )}
    </div>
  );
}
