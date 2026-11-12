'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { BellRing, CalendarClock, Check, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { defaultLessonAt, formatLessonTime, validateLessonAt } from '@/lib/education/lessonPlan';
import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/education/firstGamePlan';
import { cn } from '@/lib/utils';
import { PRESS } from '@/components/education/live/eduLiveStyles';

const K = 'eduLiveRoom.hostResults.lessonPlan';

export type LessonPlanSource = 'practice_results' | 'class_setup';

const COPY: Record<LessonPlanSource, { title: string; body: string }> = {
  practice_results: { title: 'eduLiveRoom.hostResults.lessonPlan.title', body: 'eduLiveRoom.hostResults.lessonPlan.body' },
  class_setup: { title: 'eduLiveRoom.hostResults.lessonPlan.setupTitle', body: 'eduLiveRoom.hostResults.lessonPlan.setupBody' },
};

const BUTTON_BASE = cn(
  PRESS,
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-neo-lg border-[3px] px-3 text-center font-neo-display text-sm font-black normal-case shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:transition-none @5xl/results:text-base'
);
const PRIMARY = cn(BUTTON_BASE, 'w-full border-neo-black bg-neo-cyan text-neo-navy');
const QUIET = cn(BUTTON_BASE, 'shrink-0 border-neo-cream/50 bg-neo-navy text-neo-cream');

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
  after,
}: {
  classroomId: string;
  source?: LessonPlanSource;
  className?: string;
  /** Mounts with the prompt, never before it, so nothing below jumps when it lands. */
  after?: ReactNode;
}) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const inputId = useId();
  const titleId = useId();
  const [when, setWhen] = useState(() => toDatetimeLocal(defaultLessonAt(new Date())));
  const [status, setStatus] = useState<Status>('loading');
  const [errorKey, setErrorKey] = useState<ErrorKey>('error');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastAttempt = useRef<Date | null>(null);
  const shown = useRef(false);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const settle = (lessonAt: string | null) => {
      if (!live) return;
      if (lessonAt) {
        setSavedAt(new Date(lessonAt));
        setStatus('saved');
      } else {
        setStatus('idle');
      }
    };
    fetch(`/api/education/lesson-plan?classroomId=${encodeURIComponent(classroomId)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { ok?: boolean; lessonAt?: string | null } | null;
        settle(res.ok && body?.ok === true && body.lessonAt ? body.lessonAt : null);
      })
      .catch(() => settle(null));
    return () => {
      live = false;
    };
  }, [userId, classroomId]);

  useEffect(() => {
    if (status !== 'idle' || shown.current) return;
    shown.current = true;
    trackGrowthEvent('lesson_plan_prompt_shown', { source });
  }, [status, source]);

  if (!user || status === 'loading') return null;

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

  return (
    <>
      <section
        data-testid="lesson-plan"
        aria-labelledby={titleId}
        aria-busy={saving}
        className={cn('flex flex-col gap-3 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light p-3 text-neo-cream shadow-hard @5xl/results:p-4', className)}
      >
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id={titleId} className="font-neo-display text-base font-black leading-tight @5xl/results:text-lg">
              {t(COPY[source].title)}
            </h2>
            {status !== 'saved' && <p className="mt-1 font-neo-body text-sm font-bold text-neo-cream/80">{t(COPY[source].body)}</p>}
          </div>
        </div>

        {status === 'saved' && savedAt ? (
          <div data-testid="lesson-plan-saved" role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="flex min-w-0 items-start gap-2 font-neo-body text-sm font-bold text-neo-cream">
              <Check className="mt-0.5 size-4 shrink-0 text-neo-lime" aria-hidden="true" />
              {t(`${K}.saved`, { when: formatLessonTime(savedAt, timezone, language) })}
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className={cn(PRESS, 'min-h-11 font-neo-display text-sm font-black text-neo-cyan underline underline-offset-4')}
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
              <label htmlFor={inputId} className="font-neo-body text-xs font-bold text-neo-cream/80">
                {t(`${K}.pickLabel`)}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={inputId}
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="min-h-11 min-w-0 grow basis-48 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy px-2 font-neo-body text-sm font-bold text-neo-cream [color-scheme:dark] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
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
                <p role="alert" className="font-neo-body text-xs font-bold text-neo-pink">
                  {t(`${K}.${errorKey}`)}
                </p>
                {errorKey === 'error' && lastAttempt.current && (
                  <button
                    type="button"
                    data-testid="lesson-plan-retry"
                    onClick={() => lastAttempt.current && save(lastAttempt.current)}
                    className={cn(PRESS, 'inline-flex min-h-11 items-center gap-1 font-neo-display text-sm font-black text-neo-cyan underline underline-offset-4')}
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
      {after}
    </>
  );
}

export default LessonPlanPrompt;
