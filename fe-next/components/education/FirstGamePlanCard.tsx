'use client';

import { useId, useState } from 'react';
import { CalendarPlus, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_LINK, NB_PANEL, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';
import {
  buildFirstGameEvent,
  defaultFirstGameStart,
  firstGameStartUrl,
  fromDatetimeLocal,
  toDatetimeLocal,
} from '@/lib/education/firstGamePlan';
import { trackFirstGameScheduled, type FirstGameCalendarTarget } from '@/lib/education/firstGamePlanTelemetry';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface FirstGamePlanCardProps {
  classroom: { id: string; name: string; join_code: string };
  joinUrl: string;
  origin: string;
  language: string;
  t: T;
  className?: string;
}

function downloadIcs(content: string, filename: string): void {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // Download blocked: the Google link is still there.
  }
}

/**
 * For the teacher who sets up a class away from the class: one calendar event at class
 * time with the student join link and a one-tap start link. Shown only while nobody has joined.
 */
export function FirstGamePlanCard({ classroom, joinUrl, origin, language, t, className }: FirstGamePlanCardProps) {
  const inputId = useId();
  const [when, setWhen] = useState(() => toDatetimeLocal(defaultFirstGameStart()));
  const [added, setAdded] = useState(false);
  const start = fromDatetimeLocal(when);

  const add = (target: FirstGameCalendarTarget) => {
    if (!start || !origin) return;
    const event = buildFirstGameEvent({
      classroomId: classroom.id,
      start,
      text: {
        title: t('eduShell.setup.plan.eventTitle', { name: classroom.name }),
        students: t('eduShell.setup.plan.eventStudents', { url: joinUrl, code: classroom.join_code }),
        start: t('eduShell.setup.plan.eventStart', { url: firstGameStartUrl(origin, language, classroom.id) }),
      },
    });
    if (target === 'google') window.open(event.googleUrl, '_blank', 'noopener,noreferrer');
    else downloadIcs(event.ics, event.filename);
    trackFirstGameScheduled({
      classroomId: classroom.id,
      target,
      hoursAhead: Math.round((start.getTime() - Date.now()) / 3_600_000),
      locale: language,
    });
    setAdded(true);
  };

  return (
    <section data-testid="first-game-plan" aria-labelledby={`${inputId}-title`} className={cn(NB_PANEL, 'flex flex-col gap-3 p-4', className)}>
      <div className="flex items-start gap-3">
        <CalendarPlus className="mt-0.5 size-6 shrink-0 text-neo-cyan" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id={`${inputId}-title`} className="font-neo-display text-lg font-black text-neo-cream">
            {t('eduShell.setup.plan.title')}
          </h2>
          <p className="font-neo-body text-sm text-neo-cream/80">{t('eduShell.setup.plan.body')}</p>
        </div>
      </div>

      <label htmlFor={inputId} className="flex flex-col gap-1 font-neo-body text-sm font-bold text-neo-cream">
        {t('eduShell.setup.plan.when')}
        <input
          id={inputId}
          data-testid="first-game-plan-when"
          type="datetime-local"
          value={when}
          onChange={(e) => {
            setWhen(e.target.value);
            setAdded(false);
          }}
          className="min-h-[48px] rounded-neo-lg border-[3px] border-neo-cream/60 bg-neo-navy px-3 font-neo-body text-base text-neo-cream [color-scheme:dark] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        />
      </label>

      {added ? (
        <p data-testid="first-game-plan-added" role="status" className="inline-flex items-center gap-2 font-neo-body text-sm font-bold text-neo-lime">
          <Check className="size-4" aria-hidden="true" />
          {t('eduShell.setup.plan.added')}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" data-testid="first-game-plan-google" disabled={!start} onClick={() => add('google')} className={cn(NB_SECONDARY, 'w-full sm:w-auto')}>
          <CalendarPlus className="size-5" aria-hidden="true" />
          {t('eduShell.setup.plan.google')}
        </button>
        <button type="button" data-testid="first-game-plan-ics" disabled={!start} onClick={() => add('ics')} className={NB_LINK}>
          <Download className="size-4" aria-hidden="true" />
          {t('eduShell.setup.plan.ics')}
        </button>
      </div>
    </section>
  );
}

