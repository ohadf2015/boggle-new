'use client';

/**
 * "Send grades to Google Classroom" (Teacher Pro, flagged OFF by default).
 * Mounted inside <ProGate feature="reports"> on /teacher/reports. Flow:
 * button → (connect Google if needed) → lesson + course + courseWork →
 * confirm → summary (updated / unmatched / failed / skipped).
 * Only courseWork created by LexiClash can be graded (Google rule), so the
 * others are disabled and a "create" action makes a gradeable one.
 */

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { isGradePassbackUiEnabled } from '@/lib/education/googleClassroomGrades';

interface Course { id: string; name: string }
interface CourseWork { id: string; title: string; maxPoints?: number; associatedWithDeveloper?: boolean }
interface Lesson { id: string; title: string }
interface Named { studentId: string; name: string | null; reason?: string }
interface PushSummary { updated: number; unmatched: Named[]; failed: Named[]; skipped: Named[]; retryAfter?: number }

type Phase = 'idle' | 'loading' | 'connect' | 'pick' | 'sending' | 'done';

const API = '/api/education/google-classroom';
/** Literal keys so reportsI18n.contract.test.ts resolves them in all six locales. */
const REASON_KEY: Record<string, string> = {
  no_email: 'teacher.reports.googleClassroom.reason.no_email',
  not_in_course: 'teacher.reports.googleClassroom.reason.not_in_course',
  duplicate_email: 'teacher.reports.googleClassroom.reason.duplicate_email',
};

async function callApi(url: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON → generic error below */
  }
  return { status: res.status, body };
}

const btn =
  'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black px-4 py-2 font-bold shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white disabled:opacity-50 disabled:hover:translate-y-0';
const selectCls = 'min-h-11 w-full rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-2 text-neo-white';

export function GoogleClassroomGradePassback({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseWork, setCourseWork] = useState<CourseWork[]>([]);
  const [lessonId, setLessonId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseWorkId, setCourseWorkId] = useState('');
  const [returnGrades, setReturnGrades] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<PushSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enabled = isGradePassbackUiEnabled();

  // OAuth callback lands back here with ?gc=connected|denied|error.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const gc = new URLSearchParams(window.location.search).get('gc');
    if (gc === 'connected') setNotice(t('teacher.reports.googleClassroom.connected'));
    else if (gc === 'denied') setNotice(t('teacher.reports.googleClassroom.denied'));
    else if (gc === 'scopes') setNotice(t('teacher.reports.googleClassroom.scopesMissing'));
    else if (gc === 'error') setNotice(t('teacher.reports.googleClassroom.errorGeneric'));
  }, [enabled, t]);

  const errorFor = useCallback(
    (status: number, body: Record<string, unknown>): string | 'reauth' => {
      if (body.reauth === true) return 'reauth';
      switch (body.error) {
        case 'not_linkable': return t('teacher.reports.googleClassroom.errorNotLinkable');
        case 'rate_limited': return t('teacher.reports.googleClassroom.errorRateLimited', { seconds: Number(body.retryAfter) || 60 });
        case 'google_not_found':
        case 'assignment_not_found': return t('teacher.reports.googleClassroom.errorNotFound');
        case 'google_forbidden': return t('teacher.reports.googleClassroom.errorForbidden');
        case 'ungraded': return t('teacher.reports.googleClassroom.errorUngraded');
        case 'not_pro': return t('teacher.reports.googleClassroom.errorNotPro');
        default:
          console.error('[gc-grades] request failed', status, body.error);
          return t('teacher.reports.googleClassroom.errorGeneric');
      }
    },
    [t],
  );

  const fail = useCallback(
    (status: number, body: Record<string, unknown>) => {
      const e = errorFor(status, body);
      if (e === 'reauth') {
        setPhase('connect');
        setError(null);
      } else {
        setError(e);
      }
    },
    [errorFor],
  );

  const open = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setSummary(null);
    try {
      const [assignRes, courseRes] = await Promise.all([getClassroomAssignments(classroomId), callApi(`${API}/courses`)]);
      const list = (assignRes.data ?? []).map((a: { id: string; title?: string | null; vocabulary_lessons?: { name?: string } | null }) => ({
        id: a.id,
        title: a.title || a.vocabulary_lessons?.name || t('teacher.reports.assignmentProgress.untitled'),
      }));
      setLessons(list);
      setLessonId((prev) => prev || list[0]?.id || '');
      if (courseRes.status !== 200 || courseRes.body.ok !== true) {
        setPhase('pick');
        fail(courseRes.status, courseRes.body);
        return;
      }
      setCourses((courseRes.body.courses as Course[]) ?? []);
      setPhase('pick');
    } catch (err) {
      console.error('[gc-grades] open failed', err);
      setPhase('pick');
      setError(t('teacher.reports.googleClassroom.errorGeneric'));
    }
  }, [classroomId, fail, t]);

  const chooseCourse = useCallback(
    async (id: string) => {
      setCourseId(id);
      setCourseWorkId('');
      setCourseWork([]);
      setError(null);
      if (!id) return;
      setBusy(true);
      try {
        const r = await callApi(`${API}/courses?courseId=${encodeURIComponent(id)}`);
        if (r.status !== 200 || r.body.ok !== true) return fail(r.status, r.body);
        setCourseWork((r.body.courseWork as CourseWork[]) ?? []);
      } catch (err) {
        console.error('[gc-grades] courseWork load failed', err);
        setError(t('teacher.reports.googleClassroom.errorGeneric'));
      } finally {
        setBusy(false);
      }
    },
    [fail, t],
  );

  const createCourseWork = useCallback(async () => {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!courseId || !lesson) return;
    setBusy(true);
    setError(null);
    try {
      const r = await callApi(`${API}/coursework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, courseId, title: lesson.title }),
      });
      if (r.status !== 200 || r.body.ok !== true) return fail(r.status, r.body);
      const created = r.body.courseWork as CourseWork;
      setCourseWork((prev) => [created, ...prev]);
      setCourseWorkId(created.id);
    } catch (err) {
      console.error('[gc-grades] create courseWork failed', err);
      setError(t('teacher.reports.googleClassroom.errorGeneric'));
    } finally {
      setBusy(false);
    }
  }, [classroomId, courseId, fail, lessonId, lessons, t]);

  const send = useCallback(async () => {
    setPhase('sending');
    setError(null);
    try {
      const r = await callApi(`${API}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, lessonOrAssignmentId: lessonId, courseId, courseWorkId, returnGrades }),
      });
      if (r.status !== 200 || r.body.ok !== true) {
        setPhase('pick');
        return fail(r.status, r.body);
      }
      setSummary(r.body as unknown as PushSummary);
      setPhase('done');
    } catch (err) {
      console.error('[gc-grades] push failed', err);
      setPhase('pick');
      setError(t('teacher.reports.googleClassroom.errorGeneric'));
    }
  }, [classroomId, courseId, courseWorkId, fail, lessonId, returnGrades, t]);

  if (!enabled) return null;

  const nameOf = (s: Named) => s.name || t('teacher.reports.assignmentProgress.anonymousStudent', { id: s.studentId.slice(0, 8) });
  const returnTo = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search.replace(/([?&])gc=[^&]*&?/, '$1');
  const selectedCw = courseWork.find((w) => w.id === courseWorkId);

  return (
    <section data-testid="gc-grade-passback" className="space-y-3 rounded-neo border-2 border-neo-cream/40 p-4">
      {notice && <p className="text-sm text-neo-cream/80" role="status">{notice}</p>}

      {phase === 'idle' && (
        <button type="button" onClick={open} className={`${btn} bg-neo-lime text-black`}>
          <GraduationCap className="size-4" aria-hidden="true" />
          {t('teacher.reports.googleClassroom.button')}
        </button>
      )}

      {(phase === 'loading' || phase === 'sending') && (
        <p className="inline-flex items-center gap-2 text-neo-cream/80" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t(phase === 'loading' ? 'teacher.reports.googleClassroom.loading' : 'teacher.reports.googleClassroom.sending')}
        </p>
      )}

      {phase === 'connect' && (
        <div className="space-y-2">
          <h3 className="font-bold text-neo-white">{t('teacher.reports.googleClassroom.connectTitle')}</h3>
          <p className="text-sm text-neo-cream/80">{t('teacher.reports.googleClassroom.connectBody')}</p>
          <a
            href={`${API}/oauth/start?returnTo=${encodeURIComponent(returnTo)}`}
            className={`${btn} bg-neo-cyan text-neo-navy`}
          >
            {t('teacher.reports.googleClassroom.connectCta')}
          </a>
        </div>
      )}

      {phase === 'pick' && (
        <div className="space-y-3">
          <label className="block space-y-1 text-sm text-neo-cream/80">
            <span>{t('teacher.reports.googleClassroom.lessonLabel')}</span>
            <select className={selectCls} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>

          <label className="block space-y-1 text-sm text-neo-cream/80">
            <span>{t('teacher.reports.googleClassroom.courseLabel')}</span>
            <select className={selectCls} value={courseId} onChange={(e) => chooseCourse(e.target.value)}>
              <option value="">{t('teacher.reports.googleClassroom.choose')}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {courses.length === 0 && !error && <p className="text-sm text-neo-cream/70">{t('teacher.reports.googleClassroom.noCourses')}</p>}

          {courseId && (
            <>
              <label className="block space-y-1 text-sm text-neo-cream/80">
                <span>{t('teacher.reports.googleClassroom.courseWorkLabel')}</span>
                <select className={selectCls} value={courseWorkId} onChange={(e) => setCourseWorkId(e.target.value)}>
                  <option value="">{t('teacher.reports.googleClassroom.choose')}</option>
                  {courseWork.map((w) => (
                    <option key={w.id} value={w.id} disabled={!w.associatedWithDeveloper || !w.maxPoints}>
                      {w.associatedWithDeveloper ? w.title : `${w.title} — ${t('teacher.reports.googleClassroom.notLinkableHint')}`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={createCourseWork} disabled={busy || !lessonId} className={`${btn} bg-neo-cyan text-neo-navy`}>
                {t('teacher.reports.googleClassroom.createCourseWork')}
              </button>
            </>
          )}

          <label className="flex items-start gap-2 text-sm text-neo-cream/80">
            <input type="checkbox" className="mt-1" checked={returnGrades} onChange={(e) => setReturnGrades(e.target.checked)} />
            <span>{t('teacher.reports.googleClassroom.returnGrades')}</span>
          </label>

          {selectedCw && <p className="text-sm text-neo-cream/70">{t('teacher.reports.googleClassroom.confirmHint', { points: selectedCw.maxPoints ?? 0 })}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={send}
              disabled={busy || !lessonId || !courseId || !courseWorkId}
              className={`${btn} bg-neo-lime text-black`}
            >
              {t('teacher.reports.googleClassroom.confirm')}
            </button>
            <button type="button" onClick={() => setPhase('idle')} className={`${btn} bg-neo-navy text-neo-white`}>
              {t('teacher.reports.googleClassroom.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-neo border-2 border-neo-pink p-3 text-sm text-neo-white">
          {error}
        </p>
      )}

      {phase === 'done' && summary && (
        <div className="space-y-2 text-sm text-neo-white" data-testid="gc-grade-summary">
          <h3 className="font-bold">{t('teacher.reports.googleClassroom.resultTitle')}</h3>
          <p>{t('teacher.reports.googleClassroom.updated', { count: summary.updated })}</p>
          {summary.skipped.length > 0 && <p>{t('teacher.reports.googleClassroom.skipped', { count: summary.skipped.length })}</p>}
          {summary.unmatched.length > 0 && (
            <div>
              <p className="font-bold">{t('teacher.reports.googleClassroom.unmatchedTitle')}</p>
              <ul className="list-disc ps-5">
                {summary.unmatched.map((s) => (
                  <li key={s.studentId}>{nameOf(s)} — {t(REASON_KEY[s.reason ?? ''] ?? REASON_KEY.not_in_course)}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.failed.length > 0 && (
            <div>
              <p className="font-bold">{t('teacher.reports.googleClassroom.failedTitle')}</p>
              <ul className="list-disc ps-5">
                {summary.failed.map((s) => <li key={s.studentId}>{nameOf(s)}</li>)}
              </ul>
            </div>
          )}
          {summary.retryAfter ? <p>{t('teacher.reports.googleClassroom.errorRateLimited', { seconds: summary.retryAfter })}</p> : null}
          <button type="button" onClick={() => setPhase('idle')} className={`${btn} bg-neo-navy text-neo-white`}>
            {t('teacher.reports.googleClassroom.done')}
          </button>
        </div>
      )}
    </section>
  );
}

export default GoogleClassroomGradePassback;
