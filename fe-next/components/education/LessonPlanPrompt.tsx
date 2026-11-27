'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BellRing, CalendarClock, Check, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { defaultLessonAt, formatLessonTime, validateLessonAt } from '@/lib/education/lessonPlan';
import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/education/firstGamePlan';
import { cn } from '@/lib/utils';
import { PRESS } from '@/components/education/live/eduLiveStyles';
import { NB_BLOCK, NB_ICON_TILE, NB_INPUT, NB_PANEL_POP } from '@/components/teacher/nb/nbStyles';
import { LessonPlanBooked } from '@/components/education/LessonPlanBooked';

const K = 'eduLiveRoom.hostResults.lessonPlan';

export type LessonPlanSource = 'practice_results' | 'class_setup' | 'teacher_home';

const COPY: Record<LessonPlanSource, { title: string; body: string }> = {
  practice_results: { title: 'eduLiveRoom.hostResults.lessonPlan.title', body: 'eduLiveRoom.hostResults.lessonPlan.body' },
  class_setup: { title: 'eduLiveRoom.hostResults.lessonPlan.setupTitle', body: 'eduLiveRoom.hostResults.lessonPlan.setupBody' },
  teacher_home: { title: 'eduLiveRoom.hostResults.lessonPlan.homeTitle', body: 'eduLiveRoom.hostResults.lessonPlan.homeBody' },
};

const BUTTON_BASE = cn(
  PRESS,
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-neo-lg border-[3px] px-3 text-center font-neo-display text-sm font-black normal-case shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:transition-none @5xl/results:text-base'
);
const PRIMARY = cn(BUTTON_BASE, 'min-h-12 w-full border-neo-black bg-neo-lime text-neo-black text-base');
const QUIET = cn(BUTTON_BASE, 'min-h-[52px] shrink-0 border-neo-black bg-neo-cream text-neo-black');

/** The class-ready screen has its own calendar card, so only the rehearsal end and Teacher Home carry the invite here. */
const INVITE_SOURCES: ReadonlySet<LessonPlanSource> = new Set(['practice_results', 'teacher_home']);

type PlanClassroom = { name: string; joinCode: string };

type Status = 'loading' | 'idle' | 'saving' | 'saved' | 'error';
type ErrorKey = 'error' | 'tooSoon' | 'tooFar';

function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function LessonPlanPrompt({
  classroomId,
  source = 'practice_results',
  className,
  reserveSpace = false,
  bookedOnly = false,
}: {
  classroomId: string;
  source?: LessonPlanSource;
  className?: string;
  /** Hold the idle card's height while the saved time loads, so nothing below it moves. */
  reserveSpace?: boolean;
  /** Show only an already booked class (Teacher Home for a class with students): no ask when nothing is booked. */
  bookedOnly?: boolean;
}) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const inputId = useId();
  const titleId = useId();
  const [when, setWhen] = useState(() => toDatetimeLocal(defaultLessonAt(new Date())));
  const [status, setStatus] = useState<Status>('loading');
  const [errorKey, setErrorKey] = useState<ErrorKey>('error');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [classroom, setClassroom] = useState<PlanClassroom | null>(null);
  const [origin, setOrigin] = useState('');
  const lastAttempt = useRef<Date | null>(null);
  const shown = useRef(false);
  const everBooked = useRef(false);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
    const settle = (lessonAt: string | null, room: PlanClassroom | null = null) => {
      if (!live) return;
      setClassroom(room);
      if (lessonAt) {
        setSavedAt(new Date(lessonAt));
        setStatus('saved');
      } else {
        setStatus('idle');
      }
    };
    fetch(`/api/education/lesson-plan?classroomId=${encodeURIComponent(classroomId)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { ok?: boolean; lessonAt?: string | null; classroom?: PlanClassroom | null } | null;
        const ok = res.ok && body?.ok === true;
        const room = ok && body?.classroom?.joinCode ? { name: body.classroom.name ?? '', joinCode: body.classroom.joinCode } : null;
        settle(ok && body?.lessonAt ? body.lessonAt : null, room);
      })
      .catch(() => settle(null));
    return () => {
      live = false;
    };
  }, [userId, classroomId]);

  useEffect(() => {
    if (status !== 'idle' || shown.current || bookedOnly) return;
    shown.current = true;
    trackGrowthEvent('lesson_plan_prompt_shown', { source });
  }, [status, source, bookedOnly]);

  if (!user) return null;
  if (status === 'saved') everBooked.current = true;
  // Booked-only stays up while the teacher changes the time, but never asks a class that booked nothing.
  if (bookedOnly && !everBooked.current) return null;
  if (status === 'loading') {
    return reserveSpace ? (
      <div
        data-testid="lesson-plan-placeholder"
        aria-hidden="true"
        className={cn('min-h-[220px] rounded-neo-lg border-[3px] border-neo-cream/50 edu-sky:border-edu-line bg-neo-navy-light edu-sky:bg-edu-surface', className)}
      />
    ) : null;
  }

  const timezone = browserTimezone();

  const save = async (at: Date) => {
    lastAttempt.current = at;
    const check = validateLessonAt(at, new Date());
    if (!check.ok) {
      setErrorKey(check.reason === 'too_far' ? 'tooFar' : 'tooSoon');
      setStatus('error');
      return;
    }
    setStatus('saving');
    try {
      const res = await fetch('/api/education/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, lessonAt: at.toISOString(), timezone, locale: language }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; lessonAt?: string; error?: string } | null;
      if (res.status === 400 && (body?.error === 'too_soon' || body?.error === 'too_far')) {
        setErrorKey(body.error === 'too_far' ? 'tooFar' : 'tooSoon');
        setStatus('error');
        return;
      }
      if (!res.ok || body?.ok !== true || !body.lessonAt) throw new Error(`lesson plan save failed: ${res.status}`);
      const stored = new Date(body.lessonAt);
      setSavedAt(stored);
      setStatus('saved');
      trackGrowthEvent('lesson_planned', { hours_ahead: Math.round((stored.getTime() - Date.now()) / 3_600_000), source });
    } catch {
      setErrorKey('error');
      setStatus('error');
    }
  };

  const saving = status === 'saving';
  const picked = fromDatetimeLocal(when);

  const showInvite = INVITE_SOURCES.has(source) && !!classroom && !!origin;

  return (
    <section
      data-testid="lesson-plan"
      aria-labelledby={titleId}
      aria-busy={saving}
      className={cn(NB_PANEL_POP.cyan, 'flex flex-col gap-3 p-4 @5xl/results:p-5', className)}
    >
      <div className="flex items-start gap-3">
        <span className={cn(NB_ICON_TILE, NB_BLOCK.cyan)} aria-hidden="true">
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-neo-display text-lg font-black leading-tight @5xl/results:text-xl">
            {t(status === 'saved' && source === 'teacher_home' ? `${K}.nextTitle` : COPY[source].title)}
          </h2>
          {status !== 'saved' && <p className="mt-1 font-neo-body text-sm font-bold text-neo-cream/80 edu-sky:text-edu-ink/80">{t(COPY[source].body)}</p>}
        </div>
      </div>

      {status === 'saved' && savedAt && showInvite && classroom ? (
        <LessonPlanBooked
          lessonAt={savedAt}
          when={formatLessonTime(savedAt, timezone, language)}
          classroom={{ id: classroomId, name: classroom.name, joinCode: classroom.joinCode }}
          origin={origin}
          language={language}
          source={source}
          onChange={() => setStatus('idle')}
          t={t}
        />
      ) : status === 'saved' && savedAt ? (
        <div data-testid="lesson-plan-saved" role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex min-w-0 items-start gap-2 font-neo-body text-sm font-bold text-neo-cream edu-sky:text-edu-ink">
            <Check className="mt-0.5 size-4 shrink-0 text-neo-lime edu-sky:text-edu-lime-ink" aria-hidden="true" />
            {t(`${K}.saved`, { when: formatLessonTime(savedAt, timezone, language) })}
          </p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className={cn(PRESS, 'min-h-11 font-neo-display text-sm font-black text-neo-cyan edu-sky:text-edu-cyan-ink underline underline-offset-4')}
          >
            {t(`${K}.change`)}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            data-testid="lesson-plan-tomorrow"
            disabled={saving}
            onClick={() => save(defaultLessonAt(new Date()))}
            className={PRIMARY}
          >
            {saving ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <BellRing className="size-4 shrink-0" aria-hidden="true" />}
            {t(`${K}.tomorrow`)}
          </button>

          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="font-neo-body text-xs font-bold text-neo-cream/80 edu-sky:text-edu-ink/80">
              {t(`${K}.pickLabel`)}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id={inputId}
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className={cn(NB_INPUT, 'min-w-0 grow basis-48 text-sm shadow-hard [color-scheme:light] w-auto')}
              />
              <button
                type="button"
                data-testid="lesson-plan-remind"
                disabled={saving || !picked}
                onClick={() => picked && save(picked)}
                className={QUIET}
              >
                {t(`${K}.remind`)}
              </button>
            </div>
          </div>

          {status === 'error' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p role="alert" className="font-neo-body text-xs font-bold text-neo-pink edu-sky:text-edu-pink-ink">
                {t(`${K}.${errorKey}`)}
              </p>
              {errorKey === 'error' && lastAttempt.current && (
                <button
                  type="button"
                  data-testid="lesson-plan-retry"
                  onClick={() => lastAttempt.current && save(lastAttempt.current)}
                  className={cn(PRESS, 'inline-flex min-h-11 items-center gap-1 font-neo-display text-sm font-black text-neo-cyan edu-sky:text-edu-cyan-ink underline underline-offset-4')}
                >
                  <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
                  {t(`${K}.retry`)}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default LessonPlanPrompt;
